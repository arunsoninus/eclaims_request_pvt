sap.ui.define([
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel",
	"./services",
	"./utility",
	"./configuration",
	"./dataformatter",
	'sap/ui/export/library',
], function (MessageBox, Filter, FilterOperator, FilterType, Fragment, Sorter, JSONModel, Services, Utility, Config, Formatter,
	exportLibrary) {
	"use strict";
	var EdmType = exportLibrary.EdmType;

	var massUploadHelper = ("nus.edu.sg.claimrequest.utils.massUploadHelper", {
		_onPressMassUploadTemplate: function (component) {
			try {
				component.showBusyIndicator(0);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/massUploadResponseDisplay", []);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/massUploadRequestPayload", []);
				var fileUploader = component.getUIControl("massClaimsUploadId", "ClaimTypeDialog");
				var file = fileUploader.oFileUpload.files[0];
				var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
				//			var ulu = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
				var ulu = component.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
				var fdlu = component.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
				var period = component.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");
				var noOfHeaderRows = component.AppModel.getProperty("/claimRequest/createClaimRequest/noOfHeaderRows");

				if (!claimType) {
					MessageBox.error("Please provide claim type!");
					component.hideBusyIndicator();
					return;
				} else if (!ulu || !fdlu) {
					MessageBox.error("Please provide ulu and fdlu!");
					component.hideBusyIndicator();
					return;
				} else if (!period) {
					MessageBox.error("Please provide claim month!");
					component.hideBusyIndicator();
					return;
				} else if (!file) {
					MessageBox.error("Please upload file!");
					component.hideBusyIndicator();
					return;
				}

				if (isNaN(parseInt(noOfHeaderRows))) {
					noOfHeaderRows = 0;
				}
				var form = new FormData();
				form.append("claimFile", file, file.name);
				form.append("claimCode", claimType);
				form.append("ulu", ulu);
				form.append("fdlu", fdlu);
				form.append("period", period);
				form.append("noOfHeaderRows", noOfHeaderRows);
				var oHeaders = Utility._headerToken(component);
				delete oHeaders['Content-Type'];
				var settings = {
					"url": "/rest/eclaims/excelUpload/requestUpload",
					"method": "POST",
					"timeout": 0,
					"headers": oHeaders,
					"processData": false,
					"mimeType": "multipart/form-data",
					"contentType": false,
					"data": form
				};
				$.ajax(settings)
					.done(function (response) {
						try {
							var parseResponse = JSON.parse(response);
							component.AppModel.setProperty("/claimRequest/createClaimRequest/massUploadResponse", parseResponse);
							if (!parseResponse.error) { //successfully upload
								component.AppModel.setProperty("/claimRequest/createClaimRequest/massUploadResponseDisplay", parseResponse.response.display_payload);
								component.AppModel.setProperty("/claimRequest/createClaimRequest/massUploadRequestPayload", parseResponse.response.request_payload);
								var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
								var requestPayload = parseResponse.response.request_payload;
								if (claimType === "102" || claimType === "103" || claimType === "104") {
									var aDisplayPayload = parseResponse.response.excelMassUploadRequestReport;
									for (var i = 0; i < aDisplayPayload.length; i++) {
										var itemOfEachRow = aDisplayPayload[i];
										//	var itemSetItem = {};
										for (var y = 0; y < requestPayload.length; y++) {
											var oRequestPayload = requestPayload[y];
											if (itemOfEachRow.staffId === parseInt(oRequestPayload.STAFF_ID, 10)) {
												var aErrorMessages = oRequestPayload.validationResults ? oRequestPayload.validationResults : [];
												var errorMessageOfEachRow = "";
												for (var p = 0; p < aErrorMessages.length; p++) {
													var itemOfEachErrorMessage = aErrorMessages[p];
													if (p === 0) {
														errorMessageOfEachRow = "(".concat((p + 1), ")").concat(" ", itemOfEachErrorMessage.message);
													} else {
														errorMessageOfEachRow = errorMessageOfEachRow.concat(". (", (p + 1)).concat(") ", itemOfEachErrorMessage.message);
													}
												}
												itemOfEachRow.errorMessage = errorMessageOfEachRow;
												break;
											}
										}
									}
									component.AppModel.setProperty("/claimRequest/createClaimRequest/massUploadResponseDisplay", parseResponse.response.excelMassUploadRequestReport);
								} else {
									//aggregate error messages for a particular claim request row				
									var aDisplayPayload = parseResponse.response.display_payload;
									for (var i = 0; i < aDisplayPayload.length; i++) {
										var itemOfEachRow = aDisplayPayload[i];
										//	var itemSetItem = {};
										var aErrorMessages = itemOfEachRow.validationResults;
										var errorMessageOfEachRow = "";
										for (var j = 0; j < aErrorMessages.length; j++) {
											var itemOfEachErrorMessage = aErrorMessages[j];
											if (j === 0) {
												errorMessageOfEachRow = "(".concat((j + 1), ")").concat(" ", itemOfEachErrorMessage.message);
											} else {
												errorMessageOfEachRow = errorMessageOfEachRow.concat(". (", (j + 1)).concat(") ", itemOfEachErrorMessage.message);
											}
										}
										itemOfEachRow.errorMessage = errorMessageOfEachRow;
									}
								}

								//
								//show the backend mass upload response in a fragment
								if (!component._oMassUploadResponse) {
									component._oMassUploadResponse = sap.ui.xmlfragment(component.createId("fragMassUploadResponse"),
										"nus.edu.sg.claimrequest.view.fragments.detaillayout.MassUploadResponse", component);
									component.getView().addDependent(component._oMassUploadResponse);
									component._oMassUploadResponse.setEscapeHandler(function () {
										return;
									});
									component._oMassUploadResponse.open();
									//	component.AppModel.setProperty("/claimRequest/createClaimRequest/rateType", "Hourly");

								}

								// close dialog
								// component.closeClaimTypeDialog();

							} else { //during failed
								MessageBox.error("Failed to upload the claim data. Please correct the file and upload it again!");
							}
						} catch (oError) {
							MessageBox.error("Failed to upload claim data.");
						} finally {
							// component.hideBusyIndicator();
						}
					}.bind(component))
					.fail(function (response) {
						var parseResponse = JSON.parse(response.responseText);
						if (parseResponse.error) {
							MessageBox.error(parseResponse.message);
						}
						// alert("error");
					}.bind(component))
					.always(function () {
						component.hideBusyIndicator();
					}.bind(component));
			} catch (oError) {
				MessageBox.error("Data Upload Failed!");
			} finally {
				// component.hideBusyIndicator();
			}

		},

		_createColumnConfig: function () {
			return [{
				label: 'S.No',
				property: 'S_NO',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Staff ID',
				property: 'STF_NUMBER',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Hours / Unit',
				property: ['HOURS_UNIT'],
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Rate Type',
				property: 'RATE_TYPE',
				width: '18'
			}, {
				label: 'Rate Amount / Discrepency Amount',
				type: EdmType.Number,
				property: 'RATE_TYPE_AMOUNT',
				scale: 2,
				width: '10'
			}, {
				label: 'Verifier',
				property: 'VERIFIER_STAFF_ID',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Additional Approver 1',
				property: 'ADDITIONAL_APP_1_STAFF_ID',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Additional Approver 2',
				property: 'ADDITIONAL_APP_2_STAFF_ID',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'WBS Element',
				property: 'WBS',
				width: '10'
			}, {
				label: 'Attachment Required',
				property: 'ATTACHMENT_REQUIRED',
				width: '10'
			}, {
				label: 'Remarks',
				property: 'REMARKS',
				width: '10'
			}, {
				label: 'Error',
				property: 'errorMessage',
				width: '10'
			}];
		},
		_createColumnConfigOvertimeCW: function () {
			return [{
				label: 'Staff ID',
				property: 'staffId',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Level',
				property: 'level',
				width: '10'
			}, {
				label: 'Day',
				property: 'day',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Start Time',
				property: 'otHmStartTime',
				width: '18'
			}, {
				label: 'End Time',
				property: 'otHmEndTime',
				width: '10'
			}, {
				label: 'Hours / Unit',
				property: ['hoursUnit'],
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Claim Day Type',
				property: ['dayType'],
				width: '10'
			}, /*{
				label: 'Opt For Compensation',
				property: 'compOffIndicator',
				width: '10'
			},*/ {
				label: 'Rate Type',
				property: 'rateType',
				width: '10'
			}, {
				label: 'Rate Amount',
				property: 'rateAmount',
				width: '10'
			}, {
				label: 'WBS Element',
				property: 'wbsElement',
				width: '10'
			}, {
				label: 'Attachment Required',
				property: 'attachmentRequired',
				width: '10'
			}, {
				label: 'Remarks',
				property: 'remarks',
				width: '10'
			}, {
				label: 'Error',
				property: 'errorMessage',
				width: '10'
			}];
		},
		_createColumnConfigOvertimeEA_NonEA: function () {
			return [{
				label: 'Staff ID',
				property: 'staffId',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Level',
				property: 'level',
				width: '10'
			}, {
				label: 'Day',
				property: 'day',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Start Time',
				property: 'otHmStartTime',
				width: '18'
			}, {
				label: 'End Time',
				property: 'otHmEndTime',
				width: '10'
			}, {
				label: 'Hours / Unit',
				property: ['hoursUnit'],
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Claim Day Type',
				property: ['dayType'],
				width: '10'
			},  {
				label: 'Opt For Compensation',
				property: ['compOffIndicator'],
				width: '10'
			}, {
				label: 'Additional Approver 1',
				property: 'additionalApproverOne',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Additional Approver 2',
				property: 'additionalApproverTwo',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'WBS Element',
				property: 'wbsElement',
				width: '10'
			}, {
				label: 'Attachment Required',
				property: 'attachmentRequired',
				width: '10'
			}, {
				label: 'Remarks',
				property: 'remarks',
				width: '10'
			}, {
				label: 'Error',
				property: 'errorMessage',
				width: '10'
			}];
		},
		_onMessagePopoverPress: function (oEvent, component) {
			var oView = component.getView();
			var oSourceControl = oEvent.getSource();
			var sPath = oSourceControl.getBindingContext("AppModel").getPath();
			if (!component._pMessagePopover) {
				component._pMessagePopover = sap.ui.xmlfragment("fragErrMessPopOver",
					"nus.edu.sg.claimrequest.view.fragments.detaillayout.MassUploadMessagePopover", component);
				oView.addDependent(component._pMessagePopover);
			}
			sap.ui.core.Fragment.byId("fragErrMessPopOver", "massUploadErroPopOver").bindAggregation("items", {
				template: new sap.m.MessageItem({
					title: "{AppModel>field}",
					subtitle: "{AppModel>message}",
					type: "Error",
					enabled: false
				}),
				path: "AppModel>" + sPath + "/validationResults"
			});
			component._pMessagePopover.openBy(oSourceControl);
		},
		_fnPostMassSubmission: function (aPayload, component) {
			var serviceUrl = Config.dbOperations.postClaim;
			var oHeaders = Utility._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, aPayload, "POST", oHeaders, function (oData) {
				var response = oData.getSource().getData();
				if (!response.error) {
					MessageBox.success("Requests created successfully!");
					component.onCancelMassUploadAfterValidation();
					component.closeClaimTypeDialog();
					component._fnReadAfterMetadataLoaded(component.getComponentModel("EclaimSrvModel"));
				} else {
					MessageBox.error("Failed to upload the data! \n Please try again!");
				}
				component.hideBusyIndicator();
			}.bind(component));

		},
	});
	return massUploadHelper;
}, true);