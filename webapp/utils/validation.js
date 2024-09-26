sap.ui.define([
		"./services",
		"./configuration",
		"./utility",
		"./dataformatter",
	], function (Services, Config, Utility, Formatter) {
		"use strict";
		var validation = ("nus.edu.sg.claimrequest.utils.validation", {
			isLengthWithinLimit: function (inputString, maxLength) {
				// Check if the length of the input string is less than or equal to the specified maxLength
				return inputString.length <= maxLength;
			},
			_fnSaveValidation: function (component) {
				var regExpHhMm = new RegExp(/^([0-9]|0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$/);
				var aValidation = [];
				var userRole = component.AppModel.getProperty("/userRole");
				var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
				var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				claimItems = Utility._fnSortingEclaimItemData(claimItems);
				var hasValidationError = false;
				var aResultClaimItems = [];

				if (claimItems) {
					component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "None");
					component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", "");
					// if (claimType === '102') {
					// 	var aDatesArray = this._getDatesForMonth(actSelMonYearInNo);
					// }
					for (var i = 0; i < claimItems.length; i++) {
						var item = claimItems[i];
						item.claimStartDate = item.CLAIM_START_DATE;
						item.claimEndDate = item.CLAIM_END_DATE;
						//To default all the Value state and value state text for all the columns
						this._fnDefaultAllValueStateAndValueStateText(item);
						var claimDate = item.CLAIM_START_DATE;
						item.havingAnyError = false;

						// wbs check
						var oHeaders = Utility._headerToken(component);
						var wbsSetItem = {};
						var saveObj = {};
						wbsSetItem.WBS = [];
						var serviceUrl = Config.dbOperations.checkWbs;
						var wbsValidateModel = new sap.ui.model.json.JSONModel();
						item.WBS_DESC = "";
						if (item.WBS && claimType !== "102") {
							//call WBS validate API 

							wbsSetItem.WBS.push(item.WBS);
							saveObj.WBSRequest = wbsSetItem;

							wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
							if (!wbsValidateModel.getData().EtOutput || !wbsValidateModel.getData().EtOutput.item) {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = "WBS does not exist."
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", item.valueStateTextWbs, claimDate));
							} else if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = wbsValidateModel.getData().EtOutput.item.EvMsg;
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", wbsValidateModel.getData().EtOutput.item.EvMsg, claimDate));
							} else {
								item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
								item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
							}
						} else if (component.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite") && claimType === "102" && i == 0) {

							wbsSetItem.WBS.push(component.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite"));
							saveObj.WBSRequest = wbsSetItem;

							wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
							if (!wbsValidateModel.getData().EtOutput || !wbsValidateModel.getData().EtOutput.item) {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = "WBS does not exist."
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", item.valueStateTextWbs, claimDate));
							} else if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", wbsValidateModel.getData().EtOutput.item.EvMsg, ""));
								component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "Error");
								component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", wbsValidateModel.getData().EtOutput
									.item
									.EvMsg);
							}
						} else {
							item.valueStateWbs = "None";
							item.valueStateTextWbs = "";
						}
						aResultClaimItems.push(item);
					}
				} else {
					//Raise the error message No Claim Items exist
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Claim Item", component.getI18n("ClaimItemRequired"), ""));
				}

				component.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aResultClaimItems);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", aValidation);
				return {
					"hasValidationError": hasValidationError
				};

			},
			_fnSubmitValidation: function (component) {
				var regExpHhMm = new RegExp(/^([0-9]|0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$/);
				var aValidation = [];
				var userRole = component.AppModel.getProperty("/userRole");
				var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
				var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				var approversList = component.AppModel.getProperty("/ApproversList");
				var allowedClaimDayTypeKey = ["Workday", "Restday", "Offday"];
				var actSelMonYearInNo = component.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");
				if (!claimRequestType && userRole === 'ESS') {
					claimRequestType = 'Daily';
				}
				var hoursSubmittedForClaim = 0;
				claimItems = Utility._fnSortingEclaimItemData(claimItems);

				// component.AppModel.setProperty("/claimRequest/createClaimRequest/LEAVING_DATE", '2023-10-25')
				// component.AppModel.setProperty("/claimRequest/createClaimRequest/ACTUAL_JOIN_DATE_FORMAT", '2023-10-05')

				var joiningDateOfStaff = Formatter.formatDateAsString(component.AppModel.getProperty(
					"/claimRequest/createClaimRequest/ACTUAL_JOIN_DATE_FORMAT"), "yyyy-MM-dd");
				var leavingDateOfStaff = Formatter.formatDateAsString(component.AppModel.getProperty(
						"/claimRequest/createClaimRequest/LEAVING_DATE"),
					"yyyy-MM-dd");
				var hasValidationError = false;
				var aResultClaimItems = [];
				var aRateTypeList = component.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
				//Check whether Verifier is mandatory or not and if it is not provided then throw the error
				var isVerifierMandatory = component.AppModel.getProperty("/isVerifierMandatory");
				var verifierId = component.AppModel.getProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_ID");
				if (isVerifierMandatory && !verifierId && claimType === '101') {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Verifier", component.getI18n("VeriferRequired"),
						"Verifier"));
				}
				//Check to ensure Additional Approver 1 is mandatory if Additional Approver 2 exists
				if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") && claimType !== '102') {
					if (!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID")) {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Additional Approver 1", component.getI18n("AdditionalApprover1Required"),
							"Additional Approvers"));
					}
				}
				//Check to ensure Additional Approver 1 and Additional Approver 2 can't be same
				if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") && !!component.AppModel.getProperty(
						"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") && claimType !== '102') {
					if ((component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") === component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID")) && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") !== "" && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") !== "") {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Additional Approver", component.getI18n("AdditionalApproverMatch"),
							"Additional Approvers"));
					}
				}

				//Check to ensure Verifier and Additional Approver 1 can't be same
				if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") && !!component.AppModel.getProperty(
						"/claimRequest/createClaimRequest/VERIFIER_STAFF_ID") && claimType !== '102') {
					if ((component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") === component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/VERIFIER_STAFF_ID")) && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") !== "" && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/VERIFIER_STAFF_ID") !== "") {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Verifier", component.getI18n("VerifierAdditionalApprover1Match"),
							"Verifier"));
					}
				}

				//Check to ensure Verifier and Additional Approver 2 can't be same
				if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") && !!component.AppModel.getProperty(
						"/claimRequest/createClaimRequest/VERIFIER_STAFF_ID") && claimType !== '102') {
					if ((component.AppModel.getProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") === component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/VERIFIER_STAFF_ID")) && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") !== "" && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/VERIFIER_STAFF_ID") !== "") {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Verifier", component.getI18n("VerifierAdditionalApprover2Match"),
							"Verifier"));
					}
				}

				//Check to ensure any of Verifier, Additional Approver 1 and Additional Approver 2 can't be same as in the Approver list
				if (!!approversList) {
					for (var i = 0; i < approversList.length; i++) {
						//if Add App1 and Approvers are same
						if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") &&
							(approversList[i].STAFF_ID === component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID"))) {
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Additional Approver 1", component.getI18n("ApproverAdditionalApprover1Match"),
								"Additional Approvers"));
						}

						//if Add App2 and Approvers are same
						if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") &&
							(approversList[i].STAFF_ID === component.AppModel.getProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID"))) {
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Additional Approver 2", component.getI18n("ApproverAdditionalApprover2Match"),
								"Additional Approvers"));
						}

						//if Verifier and Approvers are same
						if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_ID") &&
							(approversList[i].STAFF_ID === component.AppModel.getProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_ID"))) {
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Verifier", component.getI18n("ApproverVerifierMatch"),
								"Verifier"));
						}
					}
				}
				//
				//validate whether Bank Details and Cost Distribution values are set
				//var staffInfo = component.AppModel.getProperty("/staffInfo");

				var bankInfoFlag = component.AppModel.getProperty("/claimRequest/bankInfoFlag");
				var costDistFlag = component.AppModel.getProperty("/claimRequest/costDistFlag");

				if (bankInfoFlag === 'N') {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Bank Detail", component.getI18n("BankDetails"),
						"Bank Details"));
				}
				if (costDistFlag === 'N') {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Cost Distribution", component.getI18n("CostDistDetails"),
						"Cost Dist"));
				}

				if (claimItems) {
					component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "None");
					component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", "");
					if (claimType === '102') {
						var aDatesArray = this._getDatesForMonth(actSelMonYearInNo);
						this._calculateDayTypeHours(component);
					}
					for (var i = 0; i < claimItems.length; i++) {
						var item = claimItems[i];
						item.claimStartDate = item.CLAIM_START_DATE;
						item.claimEndDate = item.CLAIM_END_DATE;

						if (item.CLAIM_START_DATE < joiningDateOfStaff) {
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Join Date", component.getI18n("BeforeJoinDate"),
								item.claimStartDate));
						}
						if (item.CLAIM_START_DATE > leavingDateOfStaff) {
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Departure Date", component.getI18n("AfterLeavingDate"),
								item.claimStartDate));
						}
						//To default all the Value state and value state text for all the columns
						this._fnDefaultAllValueStateAndValueStateText(item);
						//mandatory check for Start date for Period case
						if (claimRequestType === "Period" && !item.CLAIM_START_DATE) {
							item.valueStateStartDate = "Error";
							item.valueStateTextStartDate = "Mandatory field";
							if (!item.havingAnyError) {
								item.havingAnyError = true;
							}
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Start Date", component.getI18n("StartdateRequired"), claimDate));
						}
						//mandatory check for End date for Period case
						if (claimRequestType === "Period" && !item.CLAIM_END_DATE) {
							item.valueStateEndDate = "Error";
							item.valueStateTextEndDate = "Mandatory field";
							if (!item.havingAnyError) {
								item.havingAnyError = true;
							}
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "End Date", component.getI18n("EnddateRequired"), claimDate));
						}

						var claimDate = item.CLAIM_START_DATE;
						item.havingAnyError = false;
						if (claimType === "101") {
							if (!item.RATE_TYPE) {
								item.valueStateRateType = "Error";
								item.valueStateTextRateType = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeRequired"), claimDate));
							} else if (item.RATE_TYPE === '10') {

								if (!item.START_TIME && claimRequestType === "Daily") {
									item.valueStateStartTime = "Error";
									item.valueStateTextStartTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StarttimeRequired"), claimDate));

								} else if (!regExpHhMm.test(item.START_TIME) && claimRequestType === "Daily") {
									item.valueStateStartTime = "Error";
									item.valueStateTextStartTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("IncorrectStarttimeRequired"), claimDate));
								}

								if (!item.END_TIME && claimRequestType === "Daily") {
									item.valueStateEndTime = "Error";
									item.valueStateTextEndTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("EndtimeRequired"), claimDate));
								} else if (!regExpHhMm.test(item.END_TIME) && claimRequestType === "Daily") {
									item.valueStateEndTime = "Error";
									item.valueStateTextEndTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("IncorrectEndtimeRequired"), claimDate));
								}

								if (!item.HOURS_UNIT || parseFloat(item.HOURS_UNIT).toFixed(2) <= 0) {
									item.valueStateHoursOrUnit = "Error";
									item.valueStateTextHoursOrUnit = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequired"), claimDate));
								}

								if (item.valueStateEndTime !== "Error" && item.valueStateStartTime !== "Error" && claimRequestType === "Daily") {
									// handling start time
									var claimStartDate = new Date(item.CLAIM_START_DATE);
									var arrStartTime = item.START_TIME.split(":");
									claimStartDate.setHours(parseInt(arrStartTime[0], 10));
									if (arrStartTime.length === 2) {
										claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
									} else {
										claimStartDate.setMinutes(0);
									}
									//handling end time
									var claimEndDate = new Date(item.CLAIM_END_DATE);
									var arrEndTime = item.END_TIME.split(":");
									claimEndDate.setHours(parseInt(arrEndTime[0], 10));
									if (arrEndTime.length === 2) {
										claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
									} else {
										claimEndDate.setMinutes(0);
									}

									//calculate hours between two dates
									// var differenceHours = Math.abs(claimEndDate - claimStartDate) / 36e5;
									var differenceHours = Formatter.calculateHours(item.START_TIME, item.END_TIME); // when sue raised the concern for the 23:59 to be included on 25th October
									var calcDifferenceHours = differenceHours;
									var timeLimit;

									/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/
									if (claimType === component.getI18n("PTT") && differenceHours >= 8) {
										calcDifferenceHours = differenceHours - 1;
										timeLimit = calcDifferenceHours;
										// timeLimit = timeLimit.toFixed(2);
									} else {
										timeLimit = differenceHours;
										// timeLimit = timeLimit.toFixed(2);
									}
									/**** End of Change for Computation Logic *****/

									if (parseFloat(item.HOURS_UNIT).toFixed(2) > parseFloat(timeLimit)) {
										//	item.HOURS_UNIT = calcDifferenceHours;
										//	} else {
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("CalculatedHours"), claimDate));
									}

									item.claimStartDate = claimStartDate;
									item.claimEndDate = claimEndDate;

								}
								if (item.claimStartDate >= item.claimEndDate) {
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StartTimeGtEndTime"), claimDate));
								}

							} else if (item.RATE_TYPE === '11') {
								if (parseFloat(item.HOURS_UNIT).toFixed(2) <= 0 || parseFloat(item.HOURS_UNIT).toFixed(2) > 1) {
									item.valueStateHoursOrUnit = "Error";
									//item.valueStateTextRateType = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Hours_Unit", component.getI18n("MonthlyHrsUnitValue"), claimDate));
								}
							}
							if (item.IS_DISCREPENCY) {
								if (!item.DISC_RATETYPE_AMOUNT) {
									item.valueStateDiscAmount = "Error";
									item.valueStateTextDiscAmount = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Discrepency Rate Amount", component.getI18n("DiscRateTypeAmountRequired"),
										claimDate));
								} else {
									for (var k = 0; k < aRateTypeList.length; k++) {
										if (item.RATE_TYPE === aRateTypeList[k].RateTypeCode) {
											if (parseFloat(item.DISC_RATETYPE_AMOUNT) > parseFloat(aRateTypeList[k].MAX_LIMIT)) {
												if (!item.havingAnyError) {
													item.havingAnyError = true;
												}
												if (!hasValidationError) {
													hasValidationError = true;
												}
												var sMessage = aRateTypeList[k].RateTypeDesc + " rate cannot exceed $" + aRateTypeList[k].MAX_LIMIT;
												aValidation.push(this._formatMessageList("Error", "Amount Discrepancy", sMessage, claimDate));
											}
										}
									}
								}
								if (!item.REMARKS) {
									item.valueStateDiscAmount = "Error";
									item.valueStateTextDiscAmount = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Remarks", component.getI18n("RemarksRequired"), claimDate));

								}

							} else {
								for (var k = 0; k < aRateTypeList.length; k++) {
									if (item.RATE_TYPE === aRateTypeList[k].RateTypeCode) {
										if (parseFloat(item.RATE_TYPE_AMOUNT) > parseFloat(aRateTypeList[k].MAX_LIMIT)) {
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											var sMessage = aRateTypeList[k].RateTypeDesc + " rate cannot exceed $" + aRateTypeList[k].MAX_LIMIT;
											aValidation.push(this._formatMessageList("Error", "Amount Discrepancy", sMessage, claimDate));
										}
									}
								}
							}
						} else if (claimType === "103" || claimType === "104") {

							if (!regExpHhMm.test(item.START_TIME)) {
								item.valueStateStartTime = "Error";
								item.valueStateTextStartTime = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("IncorrectStarttimeRequired"), claimDate));
							}

							if (!regExpHhMm.test(item.END_TIME)) {
								item.valueStateEndTime = "Error";
								item.valueStateTextEndTime = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("IncorrectEndtimeRequired"), claimDate));
							}

							if (item.valueStateEndTime !== "Error" && item.valueStateStartTime !== "Error") {
								// handling start time
								var claimStartDate = new Date(item.CLAIM_START_DATE);
								var arrStartTime = item.START_TIME.split(":");
								claimStartDate.setHours(parseInt(arrStartTime[0], 10));
								if (arrStartTime.length === 2) {
									claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
								} else {
									claimStartDate.setMinutes(0);
								}
								//handling end time
								var claimEndDate = new Date(item.CLAIM_END_DATE);
								var arrEndTime = item.END_TIME.split(":");
								claimEndDate.setHours(parseInt(arrEndTime[0], 10));
								if (arrEndTime.length === 2) {
									claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
								} else {
									claimEndDate.setMinutes(0);
								}

								item.claimStartDate = claimStartDate;
								item.claimEndDate = claimEndDate;
								
									if (item.claimStartDate >= item.claimEndDate) {
								item.valueStateEndTime = "Error";
								item.valueStateStartTime = "Error";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StartTimeGtEndTime"), claimDate));
							}
							}

						

							if (!item.HOURS_UNIT || parseFloat(item.HOURS_UNIT).toFixed(2) <= 0) {
								item.valueStateHoursOrUnit = "Error";
								item.valueStateTextHoursOrUnit = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequired"), claimDate));
							}
							// handling hours or unit
							var hrsOrUnit = item.HOURS_UNIT;

							var startTime = item.START_TIME;
							var endTime = item.END_TIME;
							if (startTime && endTime) {

								var differenceHours = Formatter.calculateHours(startTime, endTime);
								differenceHours = parseFloat(differenceHours).toFixed(2);
								var calcDifferenceHours = differenceHours;
								if (differenceHours >= 8) {
									calcDifferenceHours = differenceHours - 1;
									calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
								}

								if (hrsOrUnit > differenceHours) {
									item.valueStateHoursOrUnit = "Error";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitGT"), claimDate));
								}

							}

						} else if (claimType === "102") {
							var indexToRemove = aDatesArray.indexOf(item.claimStartDate);

							if (indexToRemove !== -1) {
								// Remove the date from the originalDates array
								aDatesArray.splice(indexToRemove, 1);
							}
							if (allowedClaimDayTypeKey.indexOf(item.CLAIM_DAY_TYPE) < 0) {
								item.valueStateClaimDayType = "Error";
								item.valueStateTextClaimDayType = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Day Type", component.getI18n("DayTypeRequired"), claimDate));
							}
							if (!item.RATE_TYPE) {
								item.valueStateRateType = "Error";
								item.valueStateTextRateType = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeRequired"), claimDate));
							} else if (item.RATE_TYPE === '18' || item.RATE_TYPE === '19') {

								if (!item.START_TIME && claimRequestType === "Daily") {
									item.valueStateStartTime = "Error";
									item.valueStateTextStartTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StarttimeRequired"), claimDate));

								} else if (!regExpHhMm.test(item.START_TIME) && claimRequestType === "Daily") {
									item.valueStateStartTime = "Error";
									item.valueStateTextStartTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("IncorrectStarttimeRequired"), claimDate));
								}

								if (!item.END_TIME && claimRequestType === "Daily") {
									item.valueStateEndTime = "Error";
									item.valueStateTextEndTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("EndtimeRequired"), claimDate));
								} else if (!regExpHhMm.test(item.END_TIME) && claimRequestType === "Daily") {
									item.valueStateEndTime = "Error";
									item.valueStateTextEndTime = "Mandatory field";
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("IncorrectEndtimeRequired"), claimDate));
								}
								// if (!item.HOURS_UNIT || parseFloat(item.HOURS_UNIT) <= 0) {
								// 	item.valueStateHoursOrUnit = "Error";
								// 	item.valueStateTextHoursOrUnit = "Mandatory field";
								// 	if (!item.havingAnyError) {
								// 		item.havingAnyError = true;
								// 	}
								// 	if (!hasValidationError) {
								// 		hasValidationError = true;
								// 	}
								// 	aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequired"), claimDate));
								// }

								if (item.valueStateEndTime !== "Error" && item.valueStateStartTime !== "Error" && claimRequestType === "Daily" && item.RATE_TYPE ===
									'19') {
									// handling start time
									var claimStartDate = new Date(item.CLAIM_START_DATE);
									var arrStartTime = item.START_TIME.split(":");
									claimStartDate.setHours(parseInt(arrStartTime[0], 10));
									if (arrStartTime.length === 2) {
										claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
									} else {
										claimStartDate.setMinutes(0);
									}
									//handling end time
									var claimEndDate = new Date(item.CLAIM_END_DATE);
									var arrEndTime = item.END_TIME.split(":");
									claimEndDate.setHours(parseInt(arrEndTime[0], 10));
									if (arrEndTime.length === 2) {
										claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
									} else {
										claimEndDate.setMinutes(0);
									}

									//calculate hours between two dates
									// var differenceHours = Math.abs(claimEndDate - claimStartDate) / 36e5;
									var differenceHours = Formatter.calculateHours(item.START_TIME, item.END_TIME); // when sue raised the concern for the 23:59 to be included on 25th October
									var calcDifferenceHours = differenceHours;
									var timeLimit;

									/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/
									if (claimType === component.getI18n("PTT") && differenceHours >= 8) {
										calcDifferenceHours = differenceHours - 1;
										timeLimit = calcDifferenceHours;
										// timeLimit = timeLimit.toFixed(2);
									} else {
										timeLimit = differenceHours;
										// timeLimit = timeLimit.toFixed(2);
									}
									/**** End of Change for Computation Logic *****/

									if (parseFloat(item.HOURS_UNIT).toFixed(2) > parseFloat(timeLimit)) {
										//	item.HOURS_UNIT = calcDifferenceHours;
										//	} else {
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("CalculatedHours"), claimDate));
									}

									item.claimStartDate = claimStartDate;
									item.claimEndDate = claimEndDate;

								} else if (item.RATE_TYPE === '18') {
									if (item.CLAIM_DAY === "Monday" || item.CLAIM_DAY === "Tuesday" || item.CLAIM_DAY === "Wednesday" ||
										item.CLAIM_DAY === "Thursday") {

										if (!(item.IS_PH == 2 || item.IS_PH == 5) && item.CLAIM_DAY_TYPE === 'Workday' && !(parseFloat(item.HOURS_UNIT) ==
												0 || parseFloat(item.HOURS_UNIT) == 4 || parseFloat(
													item.HOURS_UNIT) >= 8.5)) {
											// no calculation is needed
											item.valueStateHoursOrUnit = "Error";
											item.valueStateTextHoursOrUnit = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequiredForCWOtherday"),
												claimDate));
										}
										// else if (item.IS_PH == 5 && item.CLAIM_DAY_TYPE === 'Offday' && parseFloat(item.HOURS_UNIT) ==
										// 	0) {
										// 	item.valueStateHoursOrUnit = "Error";
										// 	item.valueStateTextHoursOrUnit = component.getI18n("OptForCompensationCwHours");
										// 	if (!item.havingAnyError) {
										// 		item.havingAnyError = true;
										// 	}
										// 	if (!hasValidationError) {
										// 		hasValidationError = true;
										// 	}
										// 	aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("OptForCompensationCwHours"),
										// 		claimDate));
										// }

									} else {
										if (!(item.IS_PH == 2 || item.IS_PH == 5) && item.CLAIM_DAY_TYPE === 'Workday' && !(parseFloat(item.HOURS_UNIT)
												.toFixed(2) == 0 || parseFloat(item.HOURS_UNIT).toFixed(2) == 4 || parseFloat(
													item.HOURS_UNIT).toFixed(2) >= 8)) {
											// no calculation is needed
											item.valueStateHoursOrUnit = "Error";
											item.valueStateTextHoursOrUnit = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequiredForCWFriday"),
												claimDate));
										}
									}
								}
								if (item.claimStartDate >= item.claimEndDate && item.RATE_TYPE === '19') {
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StartTimeGtEndTime"), claimDate));
								}
								hoursSubmittedForClaim = hoursSubmittedForClaim + parseFloat(item.HOURS_UNIT);
							}
						}
						// wbs check
						var oHeaders = Utility._headerToken(component);
						var wbsSetItem = {};
						var saveObj = {};
						wbsSetItem.WBS = [];
						var serviceUrl = Config.dbOperations.checkWbs;
						var wbsValidateModel = new sap.ui.model.json.JSONModel();
						item.WBS_DESC = "";
						if (item.WBS) {
							//call WBS validate API 

							wbsSetItem.WBS.push(item.WBS);
							saveObj.WBSRequest = wbsSetItem;

							wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
							if (!wbsValidateModel.getData().EtOutput || !wbsValidateModel.getData().EtOutput.item) {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = "WBS does not exist."
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", item.valueStateTextWbs, claimDate));
							} else if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = wbsValidateModel.getData().EtOutput.item.EvMsg;
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", wbsValidateModel.getData().EtOutput.item.EvMsg, claimDate));
							} else {
								item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
								item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
							}
						}
						// else if (component.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite") && claimType === "102" && i == 0) {

						// 	wbsSetItem.WBS.push(component.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite"));
						// 	saveObj.WBSRequest = wbsSetItem;

						// 	wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
						// 	if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
						// 		if (!item.havingAnyError) {
						// 			item.havingAnyError = true;
						// 		}
						// 		if (!hasValidationError) {
						// 			hasValidationError = true;
						// 		}
						// 		aValidation.push(this._formatMessageList("Error", "WBS Element", wbsValidateModel.getData().EtOutput.item.EvMsg, ""));
						// 		component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "Error");
						// 		component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", wbsValidateModel.getData().EtOutput
						// 			.item
						// 			.EvMsg);
						// 	}
						// 	// else {
						// 	// 	// item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
						// 	// 	// item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
						// 	// 	component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "None");
						// 	// 	component.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", "");
						// 	// }
						// }
						else {
							item.valueStateWbs = "None";
							item.valueStateTextWbs = "";
						}

						//future dated records cannot be submitted
						//added the condition of ESS on 29 March as CA will be allowed to submit future dated claims
						if (userRole === 'ESS' && new Date(item.CLAIM_END_DATE) > new Date() && item.RATE_TYPE !== '18') {
							if (!item.havingAnyError) {
								item.havingAnyError = true;
							}
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Date", component.getI18n("RestrictingFutureDated"), claimDate));
						}

						//check for max limit for the individate rates

						// handling overlapping check
						// var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
						for (var c = 0; c < claimItems.length; c++) { //running loop to handle for each date
							var comparingItem = claimItems[c];
							if (claimRequestType === "Daily") {
								if (claimType === "103" || claimType === "104") {
									if ((item.CLAIM_START_DATE === comparingItem.CLAIM_START_DATE) && (c !== i)) {
										var claimStartDate = new Date(comparingItem.CLAIM_START_DATE);
										var arrStartTime = comparingItem.START_TIME.split(":");
										claimStartDate.setHours(parseInt(arrStartTime[0], 10));
										if (arrStartTime.length === 2) {
											claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
										} else {
											claimStartDate.setMinutes(0);
										}
										//handling end time
										var claimEndDate = new Date(comparingItem.CLAIM_END_DATE);
										//var arrEndTime = item.END_TIME.split(":");
										var arrEndTime = comparingItem.END_TIME.split(":");
										claimEndDate.setHours(parseInt(arrEndTime[0], 10));
										if (arrEndTime.length === 2) {
											claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
										} else {
											claimEndDate.setMinutes(0);
										}

										if ((claimStartDate > item.claimStartDate && claimStartDate < item.claimEndDate) || (claimEndDate > item.claimStartDate &&
												claimEndDate < item.claimEndDate)) {
											item.valueStateEndTime = "Error";
											item.valueStateTextEndTime = "Overlapping Issue";
											comparingItem.valueStateEndTime = "Error";
											comparingItem.valueStateTextEndTime = "Overlapping Issue";

											item.valueStateStartTime = "Error";
											//	item.valueStateStartTime = "Overlapping Issue";
											//	comparingItem.valueStateEndTime = "Error";
											comparingItem.valueStateStartTime = "Error";
											comparingItem.valueStateTextStartTime = "Overlapping Issue";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Claim Dates", component.getI18n("OverlappingIssue"), claimDate));
										}

										//checking the WBS

										if (item.WBS !== comparingItem.WBS) {

											item.valueStateWbs = "Error";
											item.valueStateTextWbs = "WBS must be same for a single day.";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "WBS Element", component.getI18n("wbsMessageSame"), claimDate));

										}

										//checking the day type
										if (item.CLAIM_DAY_TYPE !== comparingItem.CLAIM_DAY_TYPE) {

											item.valueStateClaimDayType = "Error";
											item.valueStateTextClaimDayType = "Day type must be same for a single day.";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Day Type", component.getI18n("claimDayTypeSame"), claimDate));

										}

									}
								} else if (claimType === "101") {
									if ((item.CLAIM_START_DATE === comparingItem.CLAIM_START_DATE) && (c !== i)) {

										//not more than one per script allowed
										//rate code is 14
										if (item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '10') {
											// handling start time
											var claimStartDate = new Date(comparingItem.CLAIM_START_DATE);
											var arrStartTime = comparingItem.START_TIME.split(":");
											claimStartDate.setHours(parseInt(arrStartTime[0], 10));
											if (arrStartTime.length === 2) {
												claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
											} else {
												claimStartDate.setMinutes(0);
											}
											//handling end time
											var claimEndDate = new Date(comparingItem.CLAIM_END_DATE);
											//var arrEndTime = item.END_TIME.split(":");
											var arrEndTime = comparingItem.END_TIME.split(":");
											claimEndDate.setHours(parseInt(arrEndTime[0], 10));
											if (arrEndTime.length === 2) {
												claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
											} else {
												claimEndDate.setMinutes(0);
											}

											if ((claimStartDate > item.claimStartDate && claimStartDate < item.claimEndDate) || (claimEndDate > item.claimStartDate &&
													claimEndDate < item.claimEndDate)) {
												item.valueStateEndTime = "Error";
												item.valueStateTextEndTime = "Overlapping Issue";
												comparingItem.valueStateEndTime = "Error";
												comparingItem.valueStateTextEndTime = "Overlapping Issue";

												item.valueStateStartTime = "Error";
												//	item.valueStateStartTime = "Overlapping Issue";
												//	comparingItem.valueStateEndTime = "Error";
												comparingItem.valueStateStartTime = "Error";
												comparingItem.valueStateTextStartTime = "Overlapping Issue";
												if (!item.havingAnyError) {
													item.havingAnyError = true;
												}
												if (!hasValidationError) {
													hasValidationError = true;
												}
												aValidation.push(this._formatMessageList("Error", "Claim Dates", component.getI18n("OverlappingIssue"), claimDate));
											}

										}

										//hourly and monthly cannot be possible
										if ((item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '11') || (comparingItem.RATE_TYPE === '10' && item.RATE_TYPE ===
												'11')) {
											item.valueStateRateType = "Error";
											item.valueStateTextRateType = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeHourlyMonthlyMismatch"),
												claimDate));
										}
										//not more than one per script allowed
										//rate code is 14
										if (item.RATE_TYPE === '14' && comparingItem.RATE_TYPE === '14') {
											item.valueStateRateType = "Error";
											item.valueStateTextRateType = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("PerScriptMismatch"), claimDate));
										}
										//not more than one per student allowed
										//rate code is 12
										if (item.RATE_TYPE === '12' && comparingItem.RATE_TYPE === '12') {
											item.valueStateRateType = "Error";
											item.valueStateTextRateType = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("PerStudentMismatch"), claimDate));
										}

									}
								} else if (claimType === "102") {
									if ((item.CLAIM_START_DATE === comparingItem.CLAIM_START_DATE) && (c !== i)) {
										if (item.RATE_TYPE === '19' && comparingItem.RATE_TYPE === '19') {
											// handling start time
											var claimStartDate = new Date(comparingItem.CLAIM_START_DATE);
											var arrStartTime = comparingItem.START_TIME.split(":");
											claimStartDate.setHours(parseInt(arrStartTime[0], 10));
											if (arrStartTime.length === 2) {
												claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
											} else {
												claimStartDate.setMinutes(0);
											}
											//handling end time
											var claimEndDate = new Date(comparingItem.CLAIM_END_DATE);
											//var arrEndTime = item.END_TIME.split(":");
											var arrEndTime = comparingItem.END_TIME.split(":");
											claimEndDate.setHours(parseInt(arrEndTime[0], 10));
											if (arrEndTime.length === 2) {
												claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
											} else {
												claimEndDate.setMinutes(0);
											}

											if ((claimStartDate > item.claimStartDate && claimStartDate < item.claimEndDate) || (claimEndDate > item.claimStartDate &&
													claimEndDate < item.claimEndDate)) {
												item.valueStateEndTime = "Error";
												item.valueStateTextEndTime = "Overlapping Issue";
												comparingItem.valueStateEndTime = "Error";
												comparingItem.valueStateTextEndTime = "Overlapping Issue";

												item.valueStateStartTime = "Error";
												//	item.valueStateStartTime = "Overlapping Issue";
												//	comparingItem.valueStateEndTime = "Error";
												comparingItem.valueStateStartTime = "Error";
												comparingItem.valueStateTextStartTime = "Overlapping Issue";
												if (!item.havingAnyError) {
													item.havingAnyError = true;
												}
												if (!hasValidationError) {
													hasValidationError = true;
												}
												aValidation.push(this._formatMessageList("Error", "Claim Dates", component.getI18n("OverlappingIssue"), claimDate));
											}

										}

										//hourly and monthly cannot be possible
										if ((item.RATE_TYPE === '19' && comparingItem.RATE_TYPE === '18') || (comparingItem.RATE_TYPE === '18' && item.RATE_TYPE ===
												'19')) {
											item.valueStateRateType = "Error";
											item.valueStateTextRateType = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeHourlyMonthlyMismatch"),
												claimDate));
										}
										// check on the same day type

										if (item.CLAIM_DAY_TYPE !== comparingItem.CLAIM_DAY_TYPE) {
											item.valueStateClaimDayType = "Error";
											item.valueStateTextClaimDayType = component.getI18n("DayTypeMismatch");
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Day Type", component.getI18n("DayTypeMismatch"),
												claimDate));
										}
									}
								}

							} else {
								if (claimType === "101") {
									if ((c !== i)) {

										//hourly and monthly cannot be possible
										if ((item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '11') || (comparingItem.RATE_TYPE === '10' && item.RATE_TYPE ===
												'11')) {
											item.valueStateRateType = "Error";
											item.valueStateTextRateType = "Mandatory field";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeHourlyMonthlyMismatch"),
												claimDate));
										}

										if ((item.CLAIM_START_DATE >= comparingItem.CLAIM_START_DATE && item.CLAIM_START_DATE <= comparingItem.CLAIM_END_DATE)) {
											//check same rate type for overlapping
											if (item.RATE_TYPE === comparingItem.RATE_TYPE) {
												//Added condition to ensure if Rate Amount is same as well then only Period Overlap error would trigger
												if (item.RATE_TYPE_AMOUNT === comparingItem.RATE_TYPE_AMOUNT) {
													item.valueStateStartDate = "Error";
													item.valueStateTextStartDate = "Period Overlapping";
													comparingItem.valueStateStartDate = "Error";
													comparingItem.valueStateTextStartDate = "Period Overlapping";

													item.valueStateEndDate = "Error";
													item.valueStateTextEndDate = "Period Overlapping";
													comparingItem.valueStateEndDate = "Error";
													comparingItem.valueStateTextEndDate = "Period Overlapping";

													if (!item.havingAnyError) {
														item.havingAnyError = true;
													}
													if (!hasValidationError) {
														hasValidationError = true;
													}
													aValidation.push(this._formatMessageList("Error", "Claim Dates", component.getI18n("OverlappingPeriodIssues"), claimDate));
												}
											}
										}
									}
								}

							}

						}
						if ((userRole === "CA" && claimType === "101") || item.RATE_TYPE === '19') {
							if (!item.RATE_TYPE_AMOUNT || parseInt(item.RATE_TYPE_AMOUNT) <= 0) {
								item.valueStateRateAmount = "Error";
								item.valueStateTextRateAmount = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Rate Amount", component.getI18n("RateAmountRequired"), claimDate));
							}

							// if (!item.HOURS_UNIT) {
							// 	item.valueStateHoursOrUnit = "Error";
							// 	item.valueStateTextHoursOrUnit = "Mandatory field";
							// 	if (!item.havingAnyError) {
							// 		item.havingAnyError = true;
							// 	}
							// 	if (!hasValidationError) {
							// 		hasValidationError = true;
							// 	}
							// 	aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequired"), claimDate));
							// }
						}
						aResultClaimItems.push(item);
					}
					if (!claimItems.length > 0) {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Claim Item", component.getI18n("ClaimItemRequired"), ""));
					}

					if (!hoursSubmittedForClaim && claimType === '102') {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Hours Unit", component.getI18n("CollectiveClaimHoursUnit"), ""));
					}

				} else {
					//Raise the error message No Claim Items exist
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Claim Item", component.getI18n("ClaimItemRequired"), ""));
				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aResultClaimItems);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", aValidation);
				return {
					"hasValidationError": hasValidationError
				};
			},

			_fnRejectValidation: function (component) {
				var aValidation = [];
				//	var userRole = component.AppModel.getProperty("/userRole");
				//	var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				//	claimItems = Utility._fnSortingEclaimItemData(claimItems);;
				var hasValidationError = false;
				var remarks = component.AppModel.getProperty("/claimRequest/createClaimRequest/REMARKS");
				if (!remarks.length) {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Remarks", component.getI18n("RemarksMatch"),
						""));
				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", aValidation);
				return {
					"hasValidationError": hasValidationError
				};
			},

			_fnDefaultAllValueStateAndValueStateText: function (item) {
				//default the value state and value state text for all the columns
				item.valueStateStartDate = "None";
				item.valueStateTextStartDate = "";
				item.valueStateEndDate = "None";
				item.valueStateTextEndDate = "";
				item.valueStateStartTime = "None";
				item.valueStateTextStartTime = "";
				item.valueStateEndTime = "None";
				item.valueStateTextEndTime = "";
				item.valueStateHoursOrUnit = "None";
				item.valueStateTextHoursOrUnit = "";
				item.valueStateRateType = "None";
				item.valueStateTextRateType = "";
				item.valueStateRateAmount = "None";
				item.valueStateTextRateAmount = "";
				item.valueStateDiscAmount = "None";
				item.valueStateTextDiscAmount = "";
				item.valueStateWbs = "None";
				item.valueStateTextWbs = "";
				item.valueStateClaimDayType = "None";
				item.valueStateTextClaimDayType = "";
				return item;
			},

			_formatMessageList: function (type, sColumnName, message, claimDate) {
				var messageObj = {};
				messageObj.type = type;

				if (claimDate) {
					messageObj.displayIdx = claimDate;
					messageObj.sTitle = "Claim Date : " + messageObj.displayIdx + "\n Column :" + sColumnName;
					messageObj.idx = claimDate;
				} else {
					messageObj.sTitle = sColumnName;
				}
				messageObj.title = sColumnName;
				messageObj.state = type;
				messageObj.message = message;

				return messageObj;
			},
			_getDatesForMonth: function (aMonthYear) {
				var year = aMonthYear.split('-')[1];
				var monthNumber = aMonthYear.split('-')[0];
				// Validate the month number
				// if (monthNumber < 1 || monthNumber > 12) {
				// 	throw new Error('Invalid month number. Please provide a number between 1 and 12.');
				// }

				// // Validate the year (optional)
				// if (isNaN(year) || year < 0) {
				// 	throw new Error('Invalid year. Please provide a valid year.');
				// }

				// Create an array to store the dates
				var datesArray = [];

				// Determine the last day of the month
				var lastDay = new Date(year, monthNumber, 0).getDate();

				// Loop through the days of the month and add them to the array
				for (let i = 1; i <= lastDay; i++) {
					var day = i < 10 ? '0' + i : i; // Add leading zero if needed
					var formattedDate = `${year}-${monthNumber < 10 ?  monthNumber : monthNumber}-${day}`;
					datesArray.push(formattedDate);
				}

				return datesArray;
			},
			_calculateDayTypeHours: function (component) {
				var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
				var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				var allowedClaimDayTypeKey = ["Workday", "Restday", "Offday"];
				var objWorkday = {
					"CLAIM_DAY_TYPE": "Workday",
					"HOURS_UNIT": 0
				};
				var objRestDay = {
					"CLAIM_DAY_TYPE": "Restday",
					"HOURS_UNIT": 0
				};
				var objOffDay = {
					"CLAIM_DAY_TYPE": "Offday",
					"HOURS_UNIT": 0
				};
				var hoursWorkday = false;
				var hoursRestday = false;
				var hoursOffday = false;
				for (var i = 0; i < claimItems.length; i++) {
					var item = claimItems[i];
					if (allowedClaimDayTypeKey.indexOf(item.CLAIM_DAY_TYPE) === 0) {
						objWorkday.HOURS_UNIT += parseFloat(item.HOURS_UNIT);
						hoursWorkday = true;
					} else if (allowedClaimDayTypeKey.indexOf(item.CLAIM_DAY_TYPE) === 1) {
						objRestDay.HOURS_UNIT += parseFloat(item.HOURS_UNIT);
						hoursRestday = true;
					} else if (allowedClaimDayTypeKey.indexOf(item.CLAIM_DAY_TYPE) === 2) {
						objOffDay.HOURS_UNIT += parseFloat(item.HOURS_UNIT);
						hoursOffday = true;
					}
				}
				var aAggHoursDayTypeView = [];
				if (
					hoursWorkday
				) {
					aAggHoursDayTypeView.push(objWorkday);
				}
				if (
					hoursRestday
				) {
					aAggHoursDayTypeView.push(objRestDay);
				}
				if (
					hoursOffday
				) {
					aAggHoursDayTypeView.push(objOffDay);
				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/AggHoursDayTypeView", aAggHoursDayTypeView);
			}

		});
		return validation;
	},
	true);