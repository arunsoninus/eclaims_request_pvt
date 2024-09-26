sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent", "../utils/dataformatter", "sap/ui/core/Fragment", "../utils/services", "../utils/utility"
], function (JSONModel, Controller, UIComponent, Formatter, Fragment, services, Utility) {
	"use strict";

	return Controller.extend("nus.edu.sg.claimrequest.controller.BaseController", {
		//Test
		getComponentModel: function (modelName) {
			var model = (modelName) ? this.getOwnerComponent().getModel(modelName) : this.getOwnerComponent().getModel();
			return model;
		},
		setComponentModel: function (modelName) {
			var model = (modelName) ? this.getOwnerComponent().setModel(new JSONModel(), modelName) : null;
			return this.getOwnerComponent().getModel(modelName);
		},
		handleRefresh: function () {
			this.getOwnerComponent().getInitialDataForUser();
		},
		getI18n: function (sTextField) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var i18nTextValue = oResourceBundle.getText(sTextField);
			return i18nTextValue ? i18nTextValue : sTextField;
		},
		/*
		 * Display Message in different Sections
		 */
		showMessagePopOver: function (messageElement) {
			messageElement = JSON.parse(JSON.stringify(messageElement));
			var messageModel = this.modelAssignment("MessagePopOver");
			// var data = messageModel.getData();
			var data = [];
			// data = (data instanceof Array) ? data : [];
			messageElement = (messageElement instanceof Array) ? messageElement : [messageElement];
			for (var i = 0; i < messageElement.length; i++) {
				data.push(messageElement[i]);
			}
			messageModel.setData(data);
			var showButton = this.getUIControl("showMsgeBtnId");
			showButton.firePress();
		},
		/*
		 * Close Message PopOver
		 */
		closeMessagePopOver: function () {
			//Initialize Message PopOver for the first time
			var messageModel = this.modelAssignment("MessagePopOver");
			if (!Formatter.validateDataInModels(messageModel)) {
				messageModel.setData(this.getOwnerComponent().getModel().getProperty("/messagedata"));
			}
			var data = messageModel.getData();
			data = (data.length > 0) ? [data[0]] : [];
			messageModel.setData(data);
		},
		/**
		 * Handle Navigation
		 */
		handleNav: function (target) {
			var navCon = this.getUIControl("claimNav");
			if (target) {
				navCon.to(this.getUIControl(target), "slide");
			}
		},
		/**
		 * Handle Routing
		 */
		handleRouting: function (target, navObj) {
			this.oRouter = this.getOwnerComponent().getRouter();
			if (!navObj) {
				navObj = {};
			}
			if (!navObj.layout) {
				navObj.layout = this.getOwnerComponent().getHelper().getNextUIState(1).layout;
			}
			this.oRouter.navTo(target, navObj);
		},
		/**
		 * Lookup Value Help
		 */
		lookupValueHelp: function (oEvent) {

			var showDesc = false;
			if (oEvent.getSource().getProperty("dialogCodeLbl") === 'CLAIM_TYPE_C') {
				this.handleValueHelpClaimType();
				showDesc = false;
			} else if (oEvent.getSource().getProperty("dialogCodeLbl") === 'wbs') {
				this.wbsElementsLookUp();
				showDesc = false;
			} else if (oEvent.getSource().getProperty("dialogCodeLbl") === 'FULL_NM') {
				this.addApproverLookUp();
				showDesc = false;
			} else if (oEvent.getSource().getProperty("dialogCodeLbl") === 'ULU_T') {
				//	this.addApproverLookUp();
				showDesc = false;
			} else if (oEvent.getSource().getProperty("dialogCodeLbl") === 'FDLU_T') {
				//	this.addApproverLookUp();
				showDesc = false;
			} else {
				this.staffListLookUp();
				showDesc = true;
			}
			var src = oEvent.getSource();
			var bindingControl = oEvent.getSource().getBindingInfo("value").parts[0].path;
			var data;
			// var ownerComponent = this.getComponentModel("LookupModel");
			data = this.AppModel.getProperty(src.getUrlAttr());
			// this.closeMessagePopOver();
			var that = this;
			src.openValueHelp(oEvent, null, true, data, true, function (selectedObj) {
				that.setValuesFromLookup(bindingControl, selectedObj);
			}, showDesc);
		},
		wbsElementsLookUp: function (oEvent) {
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var url = "/eclaims/rest/fetchWBS?staffId=12564";
			var wbsElementTypeModel = new JSONModel();
			wbsElementTypeModel.loadData(url, null, false, "GET", null, null, oHeaders);
			this.AppModel.setProperty("/claimRequest/wbsElementsList", wbsElementTypeModel.getProperty("/"));
		},
		staffListLookUp: function (oEvent) {

			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var selMonthYear = this.AppModel.getProperty("/claimRequest/month");
			var aSelMonthYear = selMonthYear.split("-");
			var year = aSelMonthYear[0];
			var month = parseInt(aSelMonthYear[1]) + 1;
			month = month.toString();

			var selClaimType = this.AppModel.getProperty("/claimRequest/claimType");
			//ClaimRequest>/claimType
			//uncomment the below line and comment the harcoding of month and year later, it is done because there is not much data 		
			//var url = '/eclaims/rest/eligibleClaimTypes?claimMonth=' + month + '&claimYear=' + year;
			var url = "/eclaims/rest/staffLookup?claimMonth=8&claimYear=2020&claimType=006";
			//https://eclaimsj2fq972k5h.ap1.hana.ondemand.com/eclaims/rest/staffLookup?claimMonth=&claimYear=&claimType=006
			var staffListModel = new JSONModel();
			staffListModel.loadData(url, null, false, "GET", null, null, oHeaders);

			this.AppModel.setProperty('/claimRequest/staffList', staffListModel.getProperty("/"));
		},

		claimTypesLookUp: function (oEvent) {

			var that = this;
			var token = this.AppModel.getProperty("/token");
			var isClaimantForMassUpload = this.AppModel.getProperty("/claimRequest/isMassUploadFeatureVisible");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			if (isClaimantForMassUpload) {
				var url = "/eclaims/rest/eligibleClaimTypes";
			} else {

			}

			//uncomment the below line and comment the harcoding of month and year later, it is done because there is not much data         
			// var url = '/eclaims/rest/eligibleClaimTypes?claimMonth=' + month + '&claimYear=' + year;
			var url = "/eclaims/rest/eligibleClaimTypes?claimMonth=8&claimYear=2020";
			var claimTypeModel = new JSONModel();
			// claimTypeModel.loadData(url, null, false, "GET", null, null, oHeaders);

			var oDataModel = this.getOwnerComponent().getModel("EclaimSrvModel");
			var aFilters = [];
			aFilters.push(new sap.ui.model.Filter("CLAIM_TYPE_C", sap.ui.model.FilterOperator.StartsWith, '1'));
			//var filters = this.generateFilter('CLAIM_TYPE_C', '1', sap.ui.model.FilterOperator.StartsWith);

			var that = this;
			oDataModel.read("/MasterClaimTypes", {

				filters: aFilters,
				success: function (oData) {
					if (oData) {

						//	that.AppModel.setProperty("/claimRequest/claimsList", oData.getProperty("/"));
						that.AppModel.setProperty("/claimRequest/claimsList", oData.results);
					}
				},
				error: function (oError) {

				}
			});

		},

		addApproverLookUp: function (oEvent) {

			var that = this;
			var token = this.AppModel.getProperty("/token");
			//	var isClaimantForMassUpload = this.AppModel.getProperty("/claimRequest/isMassUploadFeatureVisible");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};

			//var url = "/eclaims/rest/eligibleClaimTypes";

			//var url = "/eclaims/rest/leave/api/" + staffNumber;
			var url = "/rest/eclaims/additionalApprovers";
			var addApproverLookUpModel = new JSONModel();
			addApproverLookUpModel.loadData(url, null, false, "GET", null, null, oHeaders);
			this.AppModel.setProperty("/claimRequest/addApproversList", addApproverLookUpModel.oData.additionalApprovers);
		},

		generateFilter: function (sValueToFilter, aFilterValues, sOperator) {
			sOperator = sOperator || sap.ui.model.FilterOperator.EQ;
			var aFilterArray = aFilterValues.map(function (sFilterValue) {
				return new sap.ui.model.Filter(sValueToFilter, sOperator, sFilterValue);
			});
			return aFilterArray;
		},

		/**
		 * Set Values From Lookup
		 */
		setValuesFromLookup: function (bindingControl, selectedObj) {

			// var requestModel = this.modelAssignment("ClaimRequest");
			// var requestData = requestModel.getData();
			switch (bindingControl) {
			case "department":
				// requestModel.setProperty("/wbsElement", selectedObj.wbsElement);
				break;
			case "moduleCode":
				// requestModel.setProperty("/moduleDesc", selectedObj.moduleDesc);
				// requestModel.setProperty("/wbsWarningDisplay", false);
				break;
			case "/staffName":
				// Object.assign(requestData, selectedObj);
				break;
			case "/claimRequest/createClaimRequest/claimTypeDesc":
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimType", selectedObj.CLAIM_TYPE_C);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeDesc", selectedObj.CLAIM_TYPE_T);
				break;
			case "/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C":
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C", selectedObj.CLAIM_TYPE_C);
				//this.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_T", selectedObj.CLAIM_TYPE_T);
				break;
			default:
				break;
			}
			// requestModel.setData(requestData);
		},
		/**
		 * Model Assignment Function
		 */
		modelAssignment: function (modelName, objAssign) {
			var view = this.getView();
			var model = view.getModel(modelName);
			if (!model) {
				if (objAssign) {
					model = new JSONModel(objAssign);
				} else {
					model = new JSONModel();
				}
				view.setModel(model, modelName);
			}
			return model;
		},
		/**
		 * Get Employee Data
		 */
		getEmployeeData: function (employeeId, userList) {
			var employeeData = {};
			for (var i = 0; i < userList.length; i++) {
				if (employeeId === userList[i].userId) {
					employeeData = userList[i];
					break;
				}
			}
			return employeeData;
		},
		/**
		 * Parse Object
		 */
		parseJsonData: function (data) {
			if (data) {
				data = JSON.parse(JSON.stringify(data));
			}
			return data;
		},
		//Util Operation to Validate Date in the Appn
		checkDate: function (oEvent, srcMsgStrip, fragmentId) {
			srcMsgStrip = (srcMsgStrip) ? srcMsgStrip : (this.selectedIconTab === "Contract") ? "contractMsgStrip" : (this.selectedIconTab ===
				"Terminate") ? "terminateMsgStrip" : (this.selectedIconTab === "Ship Change") ? "shipMsgStrip" : "recruitMsgStrip";
			this.closeMessageStrip(srcMsgStrip);
			if (!(Formatter.validateEnteredDate(oEvent.getParameter("id"), oEvent.getParameter("valid")))) {
				this.showMessageStrip(srcMsgStrip, "Please select current or future date", "E", fragmentId);
			}
		},
		confirmOnAction: function (submissionCallBack) {
			var dialog = new sap.m.Dialog({
				title: "Confirmation",
				state: "Information",
				type: "Message",
				content: new sap.m.Text({
					text: "Do you want to Submit?"
				}),
				beginButton: new sap.m.Button({
					text: "Yes",
					press: function () {
						dialog.close();
						submissionCallBack();
					}
				}),
				endButton: new sap.m.Button({
					text: 'No',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		/*
		 * Show Message Strip
		 */
		showMessageStrip: function (stripId, message, mType, fragmentId) {
			var mStrip = this.getUIControl(stripId, fragmentId);
			mStrip.setText(message);
			mStrip.setType((mType === "E") ? "Error" : "None");
			mStrip.setVisible(true);
		},
		/**
		 * Show Message List in a Dialog 
		 */
		showMassUploadErrorDialog: function (errorMessageList) {
			if (this.errorDialog) {
				this.errorDialog.destroy(true);
			}
			this.errorDialog = sap.ui.xmlfragment(
				"com.stengglink.billingrequest.view.fragments.display.MassUploadErrorDialog", this);
			this.getView().addDependent(this.errorDialog);
			this.modelAssignment("ErrorMessageModel").setData(errorMessageList);
			// this.errorDialog.setModel(new JSONModel({
			// 	"errorList": errorMessageList
			// }));
			this.errorDialog.open();
		},
		closeMassErrorDialog: function () {
			if (this.errorDialog) {
				this.errorDialog.destroy(true);
			}
		},
		/**
		 * Show Mass Upload Confirmation 
		 */
		showAcknowledgementDialog: function (ackData) {
			if (this.ackDialog) {
				this.ackDialog.destroy(true);
			}
			this.ackDialog = sap.ui.xmlfragment("com.stengglink.billingrequest.view.fragments.display.AcknowledgementDialog", this);
			this.getView().addDependent(this.ackDialog);
			this.ackDialog.setModel(new JSONModel(ackData));
			this.ackDialog.open();
		},
		/**
		 * Close Mass upload Confirmation Dialog
		 */
		closeAcknowledgementDialog: function () {
			if (this.ackDialog) {
				this.ackDialog.destroy(true);
			}
		},
		/**
		 * Close Message Strip
		 */
		closeMessageStrip: function (stripIds, fragmentId) {
			stripIds = (stripIds.indexOf(",") > -1) ? stripIds.split(",") : [stripIds];
			var control;
			var that = this;
			jQuery.sap.each(stripIds, function (s) {
				control = that.getUIControl(stripIds[s], fragmentId);
				if (control) {
					control.setVisible(false);
				}
			});
		},
		/*
		 * Set Busy Indicators
		 */
		loadBusyIndicator: function (content, isBusy) {
			var pageContent = this.getView().byId(content);
			pageContent = (pageContent) ? pageContent : sap.ui.getCore().byId(content);
			pageContent.setBusy(isBusy);
		},
		/**
		 * Fetch control
		 */
		getUIControl: function (id, fragmentId) {
			var view = this.getView();
			var control = (fragmentId) ? Fragment.byId(fragmentId, id) : (view.byId(id)) ? view.byId(id) : sap.ui.getCore().byId(id);
			return control;
		},
		formatAmount: function (val) {
			return Formatter.formatRequestAmount(val);
			// if (val) {
			// 	val = Number(val);
			// 	val = val.toFixed(2);
			// 	return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			// } else {
			// 	return 0.00;
			// }
		},

		handleFilter: function () {
			var that = this;
			var sKey = this.getView().byId("itb1").getSelectedKey();
			var aFilters = this._mFilters[sKey];
			var oPayload = {
				"STAFF_NUSNET_ID": this.AppModel.getProperty("/loggedInUserInfo/userName"),
				"REQUEST_STATUS": []
			};
			for (var y = 0; y < aFilters.length; y++) {
				var obj = {};
				obj.REQUEST_STATUS = aFilters[y].oValue1;
				oPayload.REQUEST_STATUS.push(obj);
				//	oPayload.STAFF_NUSNET_ID = "CHELUK";
			}
			services.fetchFilterData(this, oPayload, function (oResponse) {
				that.AppModel.setProperty("/filterLookupData", oResponse);

			});

		},

		onPressSelectUluAndFdlu: function (oEvent) {
			var uluFdluList = [];
			this.AppModel.setProperty("/claimRequest/UluFdluList", "");
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === "ESS") {
				//start of change in the logic to prepare ULU FDLU list				
				// var otherAssignments = this.AppModel.getProperty("/otherAssignments");
				// var primaryAssignment = this.AppModel.getProperty("/primaryAssigment");
				// if (
				// 	(new Date(primaryAssignment.START_DATE) <= new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth"))) &&
				// 	(new Date(primaryAssignment.END_DATE) >= new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth")))
				// ) {
				// 	uluFdluList.push({
				// 		"ULU_C": primaryAssignment.ULU_C,
				// 		"ULU_T": primaryAssignment.ULU_T,
				// 		"FDLU_C": primaryAssignment.FDLU_C,
				// 		"FDLU_T": primaryAssignment.FDLU_T
				// 	});
				// }
				// for (var l = 0; l < otherAssignments.length; l++) {
				// 	var item = otherAssignments[l];
				// 	if (
				// 		(new Date(item.START_DATE) <= new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth"))) &&
				// 		(new Date(item.END_DATE) >= new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth")))
				// 	) {
				// 		var uluFdluListItem = {};
				// 		uluFdluListItem.ULU_C = item.ULU_C;
				// 		uluFdluListItem.ULU_T = item.ULU_T;
				// 		uluFdluListItem.FDLU_C = item.FDLU_C;
				// 		uluFdluListItem.FDLU_T = item.FDLU_T;
				// 		if (item.isDuplicateUluFdlu === 'N') {
				// 			uluFdluList.push(uluFdluListItem);
				// 		}
				// 	}
				// }

				// var aClaimTypeList = this.AppModel.getProperty("/claimRequest/claimTypeList");
				// var selMonthStartDate = new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth"));
				// var selMonthEndDate = new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth"));

				// for (var l = 0; l < aClaimTypeList.length; l++) {
				// 	var item = aClaimTypeList[l];
				// 	var eligibileStartDate = new Date(item.START_DATE);
				// 	var eligibileEndDate = new Date(item.END_DATE);

				// 	// if ((selMonthStartDate >= eligibileStartDate && selMonthStartDate <= eligibileEndDate) || (selMonthEndDate >= eligibileStartDate &&
				// 	// 		selMonthEndDate <= eligibileEndDate)) {
				// 	if (eligibileStartDate <= selMonthEndDate && eligibileEndDate >= selMonthStartDate) {
				// 		var uluFdluListItem = {};
				// 		uluFdluListItem.ULU_C = item.ULU_C;
				// 		uluFdluListItem.ULU_T = item.ULU_T;
				// 		uluFdluListItem.FDLU_C = item.FDLU_C;
				// 		uluFdluListItem.FDLU_T = item.FDLU_T;

				// 		var uluFdluDuplicate;
				// 		for (var k = 0; k < uluFdluList.length; k++) {
				// 			if (item.ULU_C === uluFdluList[k].ULU_C && item.FDLU_C === uluFdluList[k].FDLU_C) {
				// 				uluFdluDuplicate = 'Y';
				// 				break;
				// 			}
				// 		}
				// 		if (!uluFdluDuplicate) {
				// 			uluFdluList.push(uluFdluListItem);
				// 		}
				// 	}
				// }
				this.prepareUluFdluListForClaimant(uluFdluList);
				//end of change in the logic to prepare ULU FDLU list					
				this.AppModel.setProperty("/claimRequest/UluFdluList", uluFdluList);
			} else if (userRole === "CA") {
				var token = this.AppModel.getProperty("/token");
				var oHeaders = {
					"Accept": "application/json",
					"Authorization": "Bearer" + " " + token,
					"AccessPoint": "A",
					"Content-Type": "application/json"
				};
				var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
				var period = this.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");
				var caUluFdluLookUpModel = new JSONModel();
				//	https://nusbtpblj2fq972k5h.ap1.hana.ondemand.com/nusbtpbl/rest/eclaims/fetchUluFdlu?userGroup=NUS_CHRS_ECLAIMS_CA&claimType=101&period=07-2022
				// var url = "/rest/eclaims/fetchUluFdlu?userGroup=NUS_CHRS_ECLAIMS_CA&claimType=" + claimType + "&period=" + period;
				var url = "/rest/eclaims/fetchUluFdlu?userGroup=CLAIM_ASSISTANT&claimType=" + claimType + "&period=" + period;
				//	var url = "/rest/eclaims/fetchClaimTypes?staffId=" + staffId + "&userGroup=" + userGroup;

				caUluFdluLookUpModel.loadData(url, null, false, "GET", null, null, oHeaders);

				//	var uluFdluList = caUluFdluLookUpModel.getProperty("/claimDataResponse/eclaimsData");
				var uluFdluList = caUluFdluLookUpModel.getProperty("/ULU_FDLU");
				//	this.AppModel.setProperty("/claimRequest/existingDraftRequestsList", aExistingDraftRequestsList);	
				this.AppModel.setProperty("/claimRequest/UluFdluList", uluFdluList);
			}

			var oView = this.getView();
			if (!this._oDialogVerifer) {
				this._oDialogVerifer = Fragment.load({
					id: oView.getId(),
					name: "nus.edu.sg.claimrequest.view.fragments.detaillayout.UluFdluValueHelpDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}

			this._oDialogVerifer.then(function (oDialog) {
				// oDialog.setRememberSelections(true);
				oDialog.open();
			}.bind(this));
		},

		handleConfirmUluFdlu: function (oEvent) {

			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);

			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedUluFdlu = this.AppModel.getProperty(sPath);

				var objUluFdlu = {
					"ULU": objSelectedUluFdlu.ULU_T,
					"FDLU": objSelectedUluFdlu.FDLU_T
				};
				this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", objSelectedUluFdlu.ULU_T);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", objSelectedUluFdlu.FDLU_T);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", objSelectedUluFdlu.ULU_C);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", objSelectedUluFdlu.FDLU_C);
				var month;
				var year;
				if (objSelectedUluFdlu.ULU_C && objSelectedUluFdlu.FDLU_C) {
					this.getRateTypesAndRateAmount(month, year, objSelectedUluFdlu.ULU_C, objSelectedUluFdlu.FDLU_C);
				}
			}
		},

		getRateTypesAndRateAmount: function (month, year, ulu, fdlu, processCode) {

			//fetch rate Type and rate Amount 
			var token = this.AppModel.getProperty("/token");
			//	var nusNetID = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimantNusNetId");
			var claimantStaffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimantStaffId");
			var userRole = this.AppModel.getProperty("/userRole");
			if (!claimantStaffId) {
				if (userRole === "ESS") {
					//	claimantStaffId = this.AppModel.getProperty("/loggedInUserId");
					claimantStaffId = this.AppModel.getProperty("/loggedInUserStfNumber");
				}
				if (userRole === "CA") {
					//	claimantStaffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
					claimantStaffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/STAFF_ID");
				}
			}
			if (!month || !year) {
				var claimMonth = this.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");
			} else {
				claimMonth = month + '-' + year;
			}
			var saveObj;
			saveObj = {
				PROCESS_CODE: processCode,
				CLAIM_MONTH: claimMonth,
				//	NUSNET_ID: nusNetID,
				STAFF_ID: claimantStaffId,
				ULU: ulu,
				FDLU: fdlu
			};

			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};

			var url = "/rest/eclaims/rateTypes";
			var rateTypeModel = new JSONModel();

			rateTypeModel.loadData(url, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
			var selMonthRateTypeNamountList = rateTypeModel.getProperty("/eligibleRateTypes");
			var claimRequestType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
			if (!claimRequestType && userRole === 'ESS') {
				claimRequestType = 'Daily';
			}
			if (selMonthRateTypeNamountList) {
				var itemsSet = [];
				for (var i = 0; i < selMonthRateTypeNamountList.length; i++) {
					var item = selMonthRateTypeNamountList[i];
					var itemSetItem = {};
					itemSetItem.RateTypeCode = item.RATE_CODE;
					if (item.RATE_CODE === '11' && claimRequestType === 'Daily') {
						continue;
					} else if (item.RATE_CODE === "18" || item.RATE_CODE === "19" ) {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/rateType", item.RATE_CODE)
					}
					//For A007 it is ok to hardcode Rate type desc as Hourly
					//	if (item.RATE_TYPE_C === 'A007') {
					//		itemSetItem.RateTypeDesc = 'Hourly';
					//	} else {
					var rateCodeDesc = item.RATE_DESC.toLowerCase().split(" ");
					for (var j = 0; j < rateCodeDesc.length; j++) {
						rateCodeDesc[j] = rateCodeDesc[j][0].toUpperCase() + rateCodeDesc[j].slice(1);
					}
					itemSetItem.RateTypeDesc = rateCodeDesc.join(" ");
					//	}
					itemSetItem.MAX_LIMIT = item.MAX_LIMIT;
					itemSetItem.WAGE_CODE = item.WAGE_CODE;
					itemSetItem.WORKING_HOURS = item.WORKING_HOURS;
					
					// item.items[0].WAGE_CODE = '4001';
					// item.items[1].WAGE_CODE = '4005';
					itemSetItem.aAmountListitems = item.items;
					itemsSet.push(itemSetItem);
				}
				this.AppModel.setProperty("/claimRequest/createClaimRequest/RateTypeDetails", itemsSet);
				this.AppModel.setProperty("/claimRequest/selMonthRateTypeNamountList", itemsSet);
			}
		},

		showBusyIndicator: function (milliseconds) {
			var delay = milliseconds || 0;
			sap.ui.core.BusyIndicator.show(delay);
		},

		hideBusyIndicator: function () {
			sap.ui.core.BusyIndicator.hide();
		},

		prepareUluFdluListForClaimant: function (uluFdluList) {
			var userRole = this.AppModel.getProperty("/userRole");
			var aClaimTypeList = this.AppModel.getProperty("/claimRequest/claimTypeList");
			var selMonthStartDate = new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth"));
			var selMonthEndDate = new Date(this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth"));

			if (aClaimTypeList && selMonthStartDate && selMonthEndDate) {
				for (var l = 0; l < aClaimTypeList.length; l++) {
					var item = aClaimTypeList[l];
					var eligibileStartDate = new Date(item.START_DATE);
					var eligibileEndDate = new Date(item.END_DATE);

					// if ((selMonthStartDate >= eligibileStartDate && selMonthStartDate <= eligibileEndDate) || (selMonthEndDate >= eligibileStartDate &&
					// 		selMonthEndDate <= eligibileEndDate)) {
					if (eligibileStartDate <= selMonthEndDate && eligibileEndDate >= selMonthStartDate) {
						if (item.STF_NUMBER === item.SF_STF_NUMBER && userRole === 'ESS') {
							this.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimary", item.ULU_T);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimary", item.FDLU_T);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimaryCode", item.ULU_C);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimaryCode", item.FDLU_C);
						}
						var uluFdluListItem = {};
						uluFdluListItem.ULU_C = item.ULU_C;
						uluFdluListItem.ULU_T = item.ULU_T;
						uluFdluListItem.FDLU_C = item.FDLU_C;
						uluFdluListItem.FDLU_T = item.FDLU_T;

						var uluFdluDuplicate = undefined;
						for (var k = 0; k < uluFdluList.length; k++) {
							if (item.ULU_C === uluFdluList[k].ULU_C && item.FDLU_C === uluFdluList[k].FDLU_C) {
								uluFdluDuplicate = 'Y';
								break;
							}
						}
						if (!uluFdluDuplicate) {
							uluFdluList.push(uluFdluListItem);
						}
					}
				}
			}
			return uluFdluList;
		},

		settingUluFdluValues: function () {
			var userRole = this.AppModel.getProperty("/userRole");
			var primaryAssigment = this.AppModel.getProperty("/primaryAssigment");
			var otherAssignments = this.AppModel.getProperty("/otherAssignments");
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			// if (!!primaryAssigment) {
			// 	this.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimary", primaryAssigment.ULU_T);
			// 	this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimary", primaryAssigment.FDLU_T);
			// 	this.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimaryCode", primaryAssigment.ULU_C);
			// 	this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimaryCode", primaryAssigment.FDLU_C);
			// }
			if (userRole === 'ESS') {
				var uluFdluList = [];
				this.prepareUluFdluListForClaimant(uluFdluList);
				if (uluFdluList) {
					if (uluFdluList.length === 1) {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", uluFdluList[0].ULU_T);
						this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", uluFdluList[0].FDLU_T);
						this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", uluFdluList[0].ULU_C);
						this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", uluFdluList[0].FDLU_C);
					}
					// for (var j = 0; j < uluFdluList.length; j++) {

					// }
				}
				// if (!otherAssignments.length) { // changed by Pankaj on 5th Sep
				// 	if (!!primaryAssigment) {
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", primaryAssigment.ULU_T);
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", primaryAssigment.FDLU_T);
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", primaryAssigment.ULU_C);
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", primaryAssigment.FDLU_C);
				// 	}
				// } else {
				// 	//in case even otherAssignments array is filled, we should check if the ULU and FDLU are same or different; if same then prepopulate ULU FDLU
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", primaryAssigment.ULU_T);
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", primaryAssigment.FDLU_T);
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", primaryAssigment.ULU_C);
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", primaryAssigment.FDLU_C);

				// 	for (var j = 0; j < otherAssignments.length; j++) {
				// 		if (otherAssignments[j].ULU_C !== primaryAssigment.ULU_C ||  otherAssignments[j].FDLU_C !== primaryAssigment.FDLU_C) {
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", '');
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", '');
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", '');
				// 		this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", '');	
				// 		break;
				// 		}
				// 	}

				// }
			} else if (userRole === 'CA') { //added to fix the issue of wrong ULU and FDLU prepopulated value showingvfor CA
				if (!!primaryAssigment) {
					this.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimary", primaryAssigment.ULU_T);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimary", primaryAssigment.FDLU_T);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimaryCode", primaryAssigment.ULU_C);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimaryCode", primaryAssigment.FDLU_C);
				}
				var claimAuthorizations = this.AppModel.getProperty("/claimAuthorizations");
				var noOfRows = 0;
				if (!!claimAuthorizations) {
					if (claimType) {
						for (var i = 0; i < claimAuthorizations.length; i++) {
							if (claimAuthorizations[i].STAFF_USER_GRP === 'CLAIM_ASSISTANT' && claimAuthorizations[i].PROCESS_CODE === claimType) {
								//	if (claimAuthorizations.length === 1) {
								noOfRows = noOfRows + 1;
								if (noOfRows === 1) {
									this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", claimAuthorizations[i].ULU_T);
									this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", claimAuthorizations[i].FDLU_T);
									this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", claimAuthorizations[i].ULU_C);
									this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", claimAuthorizations[i].FDLU_C);
								} else if (noOfRows > 1) {
									this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", '');
									this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", '');
									this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", '');
									this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", '');
									break;
								}
							}
						}
					}

				}
			}
		},
		_fnClearAppModel: function () {
			//begin of change to fix the issue of old Rate Type Amount populating when there is none
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/EclaimsItemDataDetails", []);
			Utility._fnAppModelSetProperty(this, "/claimRequest/HEADER_REMARKS", "");
			//end of change
			Utility._fnAppModelSetProperty(this, "/attachmentList", []);
			Utility._fnAppModelSetProperty(this, "/showSearchField", false);
			Utility._fnAppModelSetProperty(this, "/rejectionRemarks", "");
			Utility._fnAppModelSetProperty(this, "/requiredUiControl", {
				"ClaimTypeDialog": {
					"claimType": true,
					"selectMonth": true,
					"staffId": false,
					"ulu": true,
					"fdlu": true,
					"claimRequestType": false
				},
				"ClaimDetailView": {
					"startTime": false,
					"endTime": false,
					"hoursUnit": false,
					"rateType": false,
					"rateAmount": false,
					"isDiscrepancy": false,
					"amountDiscrepancy": false,
					"totalAmount": false,
					"wbs": false,
					"remarks": false
				}
			});
			Utility._fnAppModelSetProperty(this, "/isClaimLocked", false);
			Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", true);
			Utility._fnAppModelSetProperty(this, "/disclaimerConfirmChecked", false);
			//			Utility._fnAppModelSetProperty(this, "/claimAuthorizations", []);
			Utility._fnAppModelSetProperty(this, "/sClaimaintListUluFdlu", "");
			Utility._fnAppModelSetProperty(this, "/iconTabBarSelectedKey", "Draft");
			Utility._fnAppModelSetProperty(this, "/showSaveButton", false);
			Utility._fnAppModelSetProperty(this, "/showSubmitButton", false);
			Utility._fnAppModelSetProperty(this, "/showWithdrawButton", false);
			Utility._fnAppModelSetProperty(this, "/showRetractButton", false);
			Utility._fnAppModelSetProperty(this, "/showCheckButton", false);
			Utility._fnAppModelSetProperty(this, "/showRejectButton", false);
			Utility._fnAppModelSetProperty(this, "/showVerifyButton", false);
			Utility._fnAppModelSetProperty(this, "/showApproveButton", false);
			Utility._fnAppModelSetProperty(this, "/showAdditonalApprover2", false);
			Utility._fnAppModelSetProperty(this, "/showAdditionalApproverLink", true);
			Utility._fnAppModelSetProperty(this, "/showRemoveAdditionalApproverLink", false);
			Utility._fnAppModelSetProperty(this, "/exitFullScreen", true);
			Utility._fnAppModelSetProperty(this, "/closeColumn", true);
			Utility._fnAppModelSetProperty(this, "/isFlpBackButtonPressed", "");
			Utility._fnAppModelSetProperty(this, "/processFlowRequestID", "");
			Utility._fnAppModelSetProperty(this, "/processNode", {
				"nodes": [],
				"lanes": []
			});
			Utility._fnAppModelSetProperty(this, "/errorMessage", []);
			Utility._fnAppModelSetProperty(this, "/errorMessages", {
				"valueState": {
					"ClaimTypeDialog": {
						//"claimTypeDialogStaffId" : false
						// "proceedButton" : false,
						// "massuploadButton" : false
					},
					"ClaimDetailView": {
						"wbs": false
							// "Date" : true,
							// "StartDate" : false,
							// "EndDate" : false,
							// "SelectDates" : false
					},
					"SelectPlanningDateFromCalendar": {
						"wbs": false
					}
				},
				"valueStateText": {
					"ClaimTypeDialog": {
						//"claimTypeDialogStaffId" : false
						// "proceedButton" : false,
						// "massuploadButton" : false
					},
					"ClaimDetailView": {
						// "Date" : true,
						// "StartDate" : false,
						// "EndDate" : false,
						// "SelectDates" : false
						"wbs": false
					},
					"SelectPlanningDateFromCalendar": {
						"wbs": false
					}
				}
			});
			Utility._fnAppModelSetProperty(this, "/enable", {
				"ClaimTypeDialog": {

				},
				"ClaimDetailView": {
					"ROW_ACTIONS": true,
					"ROW_ADD": true,
					"ROW_DELETE": true,
					"CLAIM_START_DATE": true,
					"CLAIM_END_DATE": true,
					"CLAIM_DAY_TYPE": true,
					"START_TIME": true,
					"END_TIME": true,
					"HOURS_UNIT": true,
					"RATE_TYPE": true,
					"RATE_TYPE_AMOUNT": true,
					"IS_DISCREPENCY": true,
					"DISC_RATETYPE_AMOUNT": true,
					"WBS": true,
					"REMARKS": true,
					"VERIFIER_SRCH_HELP": false,
					"ADD_1_SRCH_HELP": false,
					"ADD_2_SRCH_HELP": false,
					"ATTACHMENT_UPLOAD": false,
					"HEADER_REMARKS": true
				}
			});
			Utility._fnAppModelSetProperty(this, "/visibility", {
				"ClaimTypeDialog": {
					"claimTypeDialogStaffId": false
						// "proceedButton" : false,
						// "massuploadButton" : false
				},
				"ClaimDetailView": {
					"Date": true,
					"StartDate": false,
					"EndDate": false,
					"StartTime": true,
					"EndTime": true,
					"SelectDates": false,
					"UluFdluSelection": false
				}
			});

		}
	});
}, true);