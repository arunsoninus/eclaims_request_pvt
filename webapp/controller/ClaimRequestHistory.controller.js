sap.ui.define([
	"../controller/BaseController",
	"../extensions/extendedvaluehelp",
	"sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"../utils/dataformatter",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/model/Sorter",
	"../utils/services",
	"../utils/appconstant",
	"../model/models",
	"../utils/validation",
	'sap/ui/export/library',
	'sap/ui/export/Spreadsheet',
	"../utils/utility",
	"../utils/configuration",
	"../utils/claimTypeDataHandling",
	"../utils/massUploadHelper",
	"../utils/processInstanceFlow"
], function (BaseController, ExtendedValueHelp, Fragment, JSONModel, Formatter, MessageToast, MessageBox, Filter,
	FilterOperator, FilterType, Sorter, services, AppConstant, models, validation, exportLibrary, Spreadsheet, Utility, Config,
	ClaimTypeDataHandling, MassUploadHelper, ProcessInstanceFlow) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return BaseController.extend("nus.edu.sg.claimrequest.controller.ClaimRequestHistory", {
		formatter: Formatter,

		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			//hanling navigation for detail page
			this.oRouter.getRoute("master").attachPatternMatched(this._onProjectMatched, this);

		},
		_onProjectMatched: function () {
			this.initializeModel();
			this.generateTokenForLoggedInUser();
			this.setClaimRequestTypeList(this);
			var oClaimsReqTable = this.getView().byId("idClaimRequestsTable");
			this.oTemplate = oClaimsReqTable.getBindingInfo("items").template;
			oClaimsReqTable.unbindAggregation("items");
		},
		generateTokenForLoggedInUser: function () {
			services.fetchLoggedUserToken(this, function (oRetData) {
				Utility._assignTokenAndUserInfo(oRetData, this);
				this.getClaimRequestDetails();
				Utility._fnFilterCreation(this);
			}.bind(this));
		},
		getClaimRequestDetails: function () {
			var serviceName = Config.dbOperations.metadataClaims;
			var oHeaders = Utility._headerToken(this);
			var oDataModel = new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: serviceName,
				headers: oHeaders
			});
			oDataModel.setUseBatch(false);
			oDataModel.metadataLoaded().then(function () {
				this.getOwnerComponent().setModel(oDataModel, "EclaimSrvModel");
				this._fetchLoggedInUserPhoto();
				this._fnReadAfterMetadataLoaded(oDataModel);
			}.bind(this));
		},

		_fetchLoggedInUserPhoto: function () {
			//fetch photo
			services.fetchLoggeInUserImage(this, function (oResponse) {
				this.AppModel.setProperty("/staffPhoto", oResponse.photo ? "data:image/png;base64," + oResponse.photo : null);
			}.bind(this));
		},

		_fnReadAfterMetadataLoaded: function (oDataModel) {
			var selectedKey = this.AppModel.getProperty("/iconTabBarSelectedKey");
			this.getView().byId("itb1").setSelectedKey(selectedKey);
			var aFilter = [];
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === "ESS") {
				aFilter = Utility._fnEssDraft(this);
			} else if (userRole === "CA") {
				aFilter = Utility._fnCADraft(this);
			}
			var serviceUrl = Config.dbOperations.eclaimRequestViewCount;
			services.getEclaimsRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfDraft").setCount(oResponse);
			}.bind(this));
			//	var statusServiceUrl = Config.dbOperations.statusConfig;
			//	services.getStatusConfig(statusServiceUrl, oDataModel, this, function (oResponse) {
			//		this.AppModel.setProperty("/statusConfigDetails", oResponse.results ? oResponse.results : []);
			this.setRejStatusCount();
			this.setInProcessStatusCount();
			this.setPostedStatusCount();
			this.setPendReqStatusCount();
			//to set back the initially selected icon tab after navigating back from claimdetail view as it was before getting into detail view 
			var prevSelectedKeyOfIconTabBar = sap.ui.getCore().getModel("DashboardParameterModel").getProperty("/key");
			if (prevSelectedKeyOfIconTabBar && prevSelectedKeyOfIconTabBar !== 'Draft') {
				this.AppModel.setProperty("/prevSelectedKeyOfIconTabBar",null);
				this.loadTableItemsBasedOnStatusKey(prevSelectedKeyOfIconTabBar);
				// this.getView().byId("itb1").setSelectedKey(prevSelectedKeyOfIconTabBar);
				// var sPath = "EclaimSrvModel>/EclaimRequestViews";
				// this.GlobalFilterForTable = Utility._handleIconTabBarSelect(this, prevSelectedKeyOfIconTabBar);
				// var oSorter = new sap.ui.model.Sorter({
				// 	path: "DRAFT_ID",
				// 	descending: true
				// });
				// Utility._bindItems(this, "idClaimRequestsTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
			} else if (selectedKey && selectedKey !== 'Draft') {
				this.loadTableItemsBasedOnStatusKey(selectedKey);
			} else {
				this.getDraftClaimRequests();
			}
			//this.getDraftClaimRequests();
			//
			Utility._fnFilterCreation(this);
			//	}.bind(this));
			//		this.handleFilter();   commented as it seems it's not used anywhere
			this.hideBusyIndicator();
		},

		loadTableItemsBasedOnStatusKey: function (selectedKeyOfIconTabBar) {
			this.getView().byId("itb1").setSelectedKey(selectedKeyOfIconTabBar);
			var sPath = "EclaimSrvModel>/EclaimRequestViews";
			this.GlobalFilterForTable = Utility._handleIconTabBarSelect(this, selectedKeyOfIconTabBar);
			var oSorter = new sap.ui.model.Sorter({
				path: "DRAFT_ID",
				descending: true
			});
			Utility._bindItems(this, "idClaimRequestsTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
		},

		setRejStatusCount: function () {
			var aFilter = Utility._rejStatusCount(this);
			var oDataModel = this.getOwnerComponent().getModel("EclaimSrvModel");
			var serviceUrl = Config.dbOperations.eclaimRequestViewCount;
			services.getEclaimsRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfReject").setCount(oResponse);
			}.bind(this));
		},

		setInProcessStatusCount: function () {
			var aFilter = Utility._setInProcessCount(this);
			var oDataModel = this.getOwnerComponent().getModel("EclaimSrvModel");
			var serviceUrl = Config.dbOperations.eclaimRequestViewCount;
			services.getEclaimsRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfProcess").setCount(oResponse);
			}.bind(this));
		},
		setPostedStatusCount: function () {
			var aFilter = Utility._setPostedStatusCount(this);
			var oDataModel = this.getOwnerComponent().getModel("EclaimSrvModel");
			var serviceUrl = Config.dbOperations.eclaimRequestViewCount;
			services.getEclaimsRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfPost").setCount(oResponse);
			}.bind(this));
		},
		setPendReqStatusCount: function () {
			var aFilter = Utility._setPendReqStatusCount(this);
			var oDataModel = this.getOwnerComponent().getModel("EclaimSrvModel");
			var serviceUrl = Config.dbOperations.eclaimRequestViewCount;
			services.getEclaimsRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfPendReq").setCount(oResponse);
			}.bind(this));
		},
		getDraftClaimRequests: function () {
			var userRole = this.AppModel.getProperty("/userRole");
			var sPath = "EclaimSrvModel>/EclaimRequestViews";
			if (userRole === "ESS") {
				this.GlobalFilterForTable = Utility._fnEssDraft(this);
			} else if (userRole === "CA") {
				this.GlobalFilterForTable = Utility._fnCADraft(this);
			}
			var oSorter = new sap.ui.model.Sorter({
				path: "DRAFT_ID",
				descending: true
			});
			Utility._bindItems(this, "idClaimRequestsTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
		},
		onRefreshClaimRequestsNcounts: function (oEvent) {
			this.getComponentModel("EclaimSrvModel").refresh(true);
			this._fnReadAfterMetadataLoaded(this.getComponentModel("EclaimSrvModel"));
		},

		onSelectIconFilter: function (oEvent) {
			var sPath = "EclaimSrvModel>/EclaimRequestViews";
			var sKey = oEvent.getParameter("selectedKey");
			this.AppModel.setProperty("/iconTabBarSelectedKey", sKey);
			if (sKey === "Draft") {
				this.getDraftClaimRequests();
			} else {
				this.GlobalFilterForTable = Utility._handleIconTabBarSelect(this, sKey);
				var oSorter = new sap.ui.model.Sorter({
					path: "DRAFT_ID",
					descending: true
				});
				Utility._bindItems(this, "idClaimRequestsTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
			}
		},
		onPressSortRequest: function (oEvent) {
			var sDialogTab = "sort";
			// load asynchronous XML fragment
			var fragmentName = "nus.edu.sg.claimrequest.view.ViewSettingsDialog";
			var fragId = this.getView().getId();
			Utility._handleOpenFragment(this, fragmentName, fragId, sDialogTab);
		},
		onPressGroupRequest: function (oEvent) {
			var sDialogTab = "group";
			// load asynchronous XML fragment
			if (!this._pViewSettingsDialog) {
				this._pViewSettingsDialog = Fragment.load({
					id: this.getView().getId(),
					name: "nus.edu.sg.claimrequest.view.ViewSettingsDialog",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					return oDialog;
				}.bind(this));
			}
			this._pViewSettingsDialog.then(function (oDialog) {
				oDialog.open(sDialogTab);
			});
		},
		handleConfirm: function (oEvent) {
			var oTable = this.getUIControl("idClaimRequestsTable");
			var sValue = this.getUIControl("srchFldClaimRequest").getValue();
			var oSelectedSort = oEvent.getParameter("sortItem");
			var sortingMethod = oEvent.getParameter("sortDescending");
			var oSelectedGroup = oEvent.getParameter("groupItem");
			var groupMethod = oEvent.getParameter("groupDescending");
			Utility._filterSortingRequestTable(this, oTable, sValue, oSelectedSort, sortingMethod, oSelectedGroup, groupMethod);
		},
		initializeModel: function () {
			var readOnly = this.modelAssignment("ReadOnly");
			readOnly.setProperty("/isMassSubmissionVisible", false);
			readOnly.setProperty("/isSingleSubmission", true);
			var oAppModel = this.setComponentModel("AppModel");
			oAppModel.setData(AppConstant);
			this.AppModel = oAppModel;
			this._fnClearAppModel();
		},
		/**
		 * On Press Preview Claim Request
		 */
		onPressPreviewClaimRequest: function (oEvent) {
			Utility._clearModelBeforeNavigationToClaimDetailView(this);
			//to set the selected icon tab in the model
			var prevSelectedKeyOfIconTabBar = this.getView().byId("itb1").getSelectedKey();
			this.AppModel.setProperty("/prevSelectedKeyOfIconTabBar", prevSelectedKeyOfIconTabBar);
			sap.ui.getCore().getModel("DashboardParameterModel").setProperty("/key",prevSelectedKeyOfIconTabBar);
			var localModel = oEvent.getSource().getBindingContext("EclaimSrvModel");
			var ruleSet = localModel.getPath().split("/").slice(-1).pop();
			this.handleRouting("detail", {
				project: ruleSet,
				layout: "MidColumnFullScreen"
			});
		},

		openQuickView: function (oEvent) {
			var fragId = this.getView().getId();
			var fragName = "nus.edu.sg.claimrequest.view.fragments.UserQuickView";
			Utility._handleOpenPopOver(oEvent, this, this._pQuickView, fragName, fragId);
		},

		handleQuickViewBtnPress: function (oEvent) {
			var that = this;
			var userRole = this.AppModel.getProperty("/userRole");
			// var serviceUrl = "/rest/eclaims/userDetails?userGroup=NUS_CHRS_ECLAIMS_CA";
			var serviceUrl = "/rest/eclaims/userDetails?userGroup=CLAIM_ASSISTANT";
			var oDataModel = this.getOwnerComponent().getModel("EclaimSrvModel");
			if (userRole === "CA") {
				Utility._fnOpenQuickViewForCA(this, serviceUrl);
			} else {
				serviceUrl = Config.dbOperations.chrsJobInfo;
				Utility._fnOpenQuickViewForClaimant(this, serviceUrl, oDataModel);
			}
			that.openQuickView(oEvent);
		},
		/**
		 * on Press Create Claim Request
		 */
		onPressCreateClaimRequest: function () {
			this.initializeModel();
			this.AppModel.setProperty("/claimRequest/isMassUploadFeatureVisible", false);
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === 'CA') {
				this.AppModel.setProperty("/visibility/ClaimTypeDialog/claimTypeDialogStaffId", true);
				this.AppModel.setProperty("/claimRequest/massUploadRadioSelected", true);
			}
			this.AppModel.setProperty("/claimRequest/createClaimRequest", {});
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/noOfHeaderRows", 7);
			this.claimTypeSelection();
		},
		/**
		 * on Press MAss Upload Claim Request
		 */
		onPressMassUploadClaimRequests: function () {
			this.AppModel.setProperty("/claimRequest/isMassUploadFeatureVisible", true);
			this.AppModel.setProperty("/visibility/ClaimTypeDialog/claimTypeDialogStaffId", false);
			this.AppModel.setProperty("/requiredUiControl/ClaimTypeDialog/claimTypeDialogStaffId", false);
			this.claimTypeSelection();
		},
		claimTypeSelection: function () {
			//Open a Dialog to show the Entire Data
			this.claimTypeDialog = sap.ui.xmlfragment("ClaimTypeDialog",
				"nus.edu.sg.claimrequest.view.fragments.ClaimTypeDialog", this);
			this.claimTypeDialog.addStyleClass("sapUiSizeCompact");
			this.getView().addDependent(this.claimTypeDialog);
			this.claimTypeDialog.open();
			this.initializeNewClaimRequest();
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === 'CA') {
				this.settingUluFdluValues();
			}
			this.settingClaimTypeValue();
		},
		settingClaimTypeValue: function () {
			ClaimTypeDataHandling._settingClaimTypeValue(this);
		},

		settingUluFdluRadioButtons: function () {
			var UluFdluList = ClaimTypeDataHandling._settingUluFdluRadioButton(this);
			//}
			this.AppModel.setProperty("/claimRequest/UluFdluList", UluFdluList);
		},

		initializeNewClaimRequest: function () {
			this.closeMessageStrip("claimTypeMessageStripId", "ClaimTypeDialog");
		},
		onSelectMonth: function (oEvent) {
			ClaimTypeDataHandling._onSelectMonth(oEvent, this);
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === 'ESS') {
				this.settingUluFdluValues();
			} else if (userRole === 'CA') {
				this.settingUluFdluValues();
			}
		},
		/**
		 * On Press Proceed to Create Request
		 */
		onPressProceedToCreate: function () {
			this.showBusyIndicator();
			this.confirmPopUpToNavToExistingClaimReq();
		},

		confirmAction: function () {
			this.closeMessageStrip("claimTypeMessageStripId", "ClaimTypeDialog");
			ClaimTypeDataHandling._confirmAction(this);
		},
		onSelectRateType: function (oEvent) {
			var rbs = oEvent.getSource().aRBs;
			var selectedRateType;
			jQuery.sap.each(rbs, function (i, rbElement) {
				if (rbElement.getProperty("selected")) {
					selectedRateType = rbElement.getProperty("text");
				}
			});
			this.modelAssignment("ClaimRequest").setProperty("/rateType", selectedRateType);
		},
		/**
		 * Close Claim Type Dialog
		 */
		closeClaimTypeDialog: function () {
			if (this.claimTypeDialog) {
				this.claimTypeDialog.close();
				this.claimTypeDialog.destroy();
				this.claimTypeDialog = null;
				this.claimTypeDialog = undefined;
			}
		},
		/**
		 * On Press Edit Request
		 */
		onPressEditRequest: function (oEvent) {
			this.openSource = "";
			var bindingContext = oEvent.getSource().getParent().getBindingContext("ClaimRequestHistory");
			this.requestPath = bindingContext.getPath();
			var selectedCtx = bindingContext.oModel.getProperty(bindingContext.getPath());
			var reqModel = this.modelAssignment("ClaimRequest");
			reqModel.setData({});
			reqModel.setSizeLimit(1000);
			this.currentItem = 0;
			reqModel.setData(selectedCtx);
			this.modelAssignment("ReadOnly").setProperty("/isMassSynthesisSubmission", true);
			this.handleNav("claimDetails");
		},

		onPressBack: function () {
			this.initializeModel();
			this.handleNav("searchPage");
		},

		onEnterTime: function (oEvent) {
			var sPath = oEvent.getSource().getParent().getBindingContext("ClaimRequest").getPath();
			var requestModel = this.modelAssignment("ClaimRequest");
			var shiftDate = requestModel.getProperty(sPath + "/shiftDate");
			requestModel.setProperty(sPath + "/noOfHours", "");
			var startTime = requestModel.getProperty(sPath + "/startTime");
			var endTime = requestModel.getProperty(sPath + "/endTime");
			if (startTime && endTime) {
				var timeStart = new Date(shiftDate + " " + startTime).getHours();
				var timeEnd = new Date(shiftDate + " " + endTime).getHours();

				var hourDiff = timeEnd - timeStart;

				if (hourDiff < 0) {
					hourDiff = 24 + hourDiff;
				}
				requestModel.setProperty(sPath + "/noOfHours", hourDiff);
			}
		},
		/**
		 * on Press Mass Upload Requests
		 */
		onPressMassUploadTemplate: function (oEvent) {
			try {
				MassUploadHelper._onPressMassUploadTemplate(this);

			} catch (oError) {
				this.hideBusyIndicator();
			}
		},

		onCancelMassUploadAfterValidation: function () {
			this._oMassUploadResponse.close();
			this._oMassUploadResponse.destroy();
			this._oMassUploadResponse = undefined;
			this._oMassUploadResponse = null;
		},

		_fnFetchUserDetailFromChrsJobInfo: function () {
			var that = this;
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var staffId = "";
			//	staffId = this.AppModel.getProperty("/loggedInUserId");
			staffId = this.AppModel.getProperty("/loggedInUserStfNumber");
			if (!staffId) {
				staffId = this.AppModel.getProperty("/staffId");
			}
			var filters = Utility._generateFilter("NUSNET_ID", [staffId]);
			var serviceUrl = Config.dbOperations.chrsJobInfo;
			services._readDataUsingOdataModel(serviceUrl, EclaimSrvModel, this, filters, function (oData) {
				this.AppModel.setProperty("/claimRequest/UluFdluList", oData.results);
				if (oData.results.length === 1) {
					this.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", oData.results[0].ULU_T);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", oData.results[0].FDLU_T);
				}
			}.bind(this));
		},

		onPressSearchClaimRequest: function (oEvent) {
			var oTable = this.getView().byId("idClaimRequestsTable");
			var sValue = this.getView().byId("srchFldClaimRequest").getValue();
			var sPath = "EclaimSrvModel>/EclaimRequestViews";
			var oSorter = new sap.ui.model.Sorter({
				path: "DRAFT_ID",
				descending: true
			});
			var aFilter = ClaimTypeDataHandling._onPressSearchClaimRequest(sValue, this);
			Utility._bindItems(this, "idClaimRequestsTable", sPath, oSorter, this.oTemplate, aFilter);
		},

		handleValueHelpStaff: function (oEvent, searchValue) {
			var oView = this.getView();
			var oHeaders = Utility._headerToken(this);
			var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
			var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
			var period = this.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");

			var serviceUrl = Config.dbOperations.caStaffLookUp;
			var oParameter = {
				"ulu": ulu,
				"fdlu": fdlu,
				"claimType": claimType,
				"period": period
			};
			if (searchValue) {
				oParameter.searchValue = searchValue;
			}
			services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				this.AppModel.setProperty("/claimRequest/staffList", oData.getSource().getData());
				//added the below condition to ensure the Value help fragment opens only once
				if (!searchValue) {
					var fragmentName = "nus.edu.sg.claimrequest.view.fragments.detaillayout.StaffValueHelpDialog";
					var fragId = oView.getId();
					Utility._handleOpenFragment(this, fragmentName, fragId, null);
				}
			}.bind(this));
		},

		handleConfirmStaff: function (oEvent) {
			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedStaff = this.AppModel.getProperty(sPath);
				var objStaff = {
					"STAFF_ID": objSelectedStaff.STF_NUMBER,
					"NUSNET_ID": objSelectedStaff.NUSNET_ID,
					"ULU": objSelectedStaff.ULU_C,
					"FDLU": objSelectedStaff.FDLU_C,
					"STAFF_FULL_NAME": objSelectedStaff.FULL_NM,
					"EMAIL": objSelectedStaff.EMAIL,
					"JOIN_DATE": objSelectedStaff.JOIN_DATE,
					"START_DATE": objSelectedStaff.START_DATE,
					"END_DATE": objSelectedStaff.END_DATE
				};
				this.AppModel.setProperty("/claimRequest/createClaimRequest/staffList", [objStaff]);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimantNusNetId", objSelectedStaff.NUSNET_ID);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimantStaffId", objSelectedStaff.STF_NUMBER);
			}
		},

		handleValueHelpClaimType: function (oEvent) {

			var oView = this.getView();
			var fragmentName = "nus.edu.sg.claimrequest.view.fragments.detaillayout.ClaimTypeValueHelpDialog";
			var fragId = oView.getId();
			Utility._handleOpenFragment(this, fragmentName, fragId, null);
		},

		handleConfirmClaimType: function (oEvent) {

			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);

			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedClaimType = this.AppModel.getProperty(sPath);
				var objClaimType = {
					"SF_STF_NUMBER": objSelectedClaimType.SF_STF_NUMBER,
					"STF_NUMBER": objSelectedClaimType.STF_NUMBER,
					"START_DATE": objSelectedClaimType.START_DATE,
					"END_DATE": objSelectedClaimType.END_DATE,
					"CLAIM_TYPE_C": objSelectedClaimType.CLAIM_TYPE_C,
					"CLAIM_TYPE_T": objSelectedClaimType.CLAIM_TYPE_T,
					"SUBMISSION_END_DATE": objSelectedClaimType.SUBMISSION_END_DATE,
					"PAST_MONTHS": objSelectedClaimType.PAST_MONTHS
				};
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeList", [objClaimType]);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimType", objSelectedClaimType.CLAIM_TYPE_C);
				this.setClaimRequestTypeList(this);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeDesc", objSelectedClaimType.CLAIM_TYPE_T);

				var aClaimTypeList = this.AppModel.getProperty("/claimRequest/claimTypeList");
				var userRole = this.AppModel.getProperty("/userRole");
				ClaimTypeDataHandling._performSelectMonthLogic(userRole, aClaimTypeList, this, objSelectedClaimType.CLAIM_TYPE_C);
				this.settingUluFdluValues();
			}
		},
		setClaimRequestTypeList: function (component) {
			if (component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType") === "102" || component.AppModel.getProperty(
					"/claimRequest/createClaimRequest/claimType") === "103" || component.AppModel.getProperty(
					"/claimRequest/createClaimRequest/claimType") === "104") {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRequestType", "Daily");
				component.AppModel.setProperty("/claimRequest/claimRequestTypeList", [{
					"claimRequestTypeCode": "Daily",
					"claimRequestTypeName": "Daily"
				}]);
			} else {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRequestType", "");
				component.AppModel.setProperty("/claimRequest/claimRequestTypeList", [{
					"claimRequestTypeCode": "Daily",
					"claimRequestTypeName": "Daily"
				}, {
					"claimRequestTypeCode": "Period",
					"claimRequestTypeName": "Period"
				}]);
			}

		},

		confirmPopUpToNavToExistingClaimReq: function () {

			this.fetchExistingDraftRequests();

		},

		fetchExistingDraftRequests: function () {
			var oHeaders = Utility._headerToken(this);
			var userRole = this.AppModel.getProperty("/userRole");
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
			var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
			var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
			var period = this.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");
			var userGroup = "";
			if (userRole === "ESS") {
				//	var staffId = this.AppModel.getProperty("/loggedInUserId");
				var staffId = this.AppModel.getProperty("/loggedInUserStfNumber");
			}
			if (userRole === "CA") {
				//	staffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
				staffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/STAFF_ID");
			}

			if (userRole === "CA") {
				// userGroup = "NUS_CHRS_ECLAIMS_CA"; //claim assistant
				userGroup = "CLAIM_ASSISTANT"; //claim assistant
			} else if (userRole === "ESS") {
				userGroup = "NUS_CHRS_ECLAIMS_ESS"; // employee 
			}
			//https://nusbtpblj2fq972k5h.ap1.hana.ondemand.com/nusbtpbl/rest/eclaims/draftEclaimData?claimType=101&ulu=0260026100&fdlu=0002870004&period=07-2022&staffId=CHEAD		
			var serviceUrl = Config.dbOperations.fetchDraftClaim;
			var oParameter = {
				"ulu": ulu,
				"fdlu": fdlu,
				"claimType": claimType,
				"period": period,
				"staffId": staffId
			};

			if (!ulu || !fdlu || !claimType || !period || !staffId) {
				this.hideBusyIndicator();
				this.showMessageStrip("claimTypeMessageStripId", "Please provide * required fields", "E", "ClaimTypeDialog");
				return;
			}

			/** Enhancement 
			 * Changed on : 27/09/2023
			 * Claim type : 102
			 * Change Desc : Elligibility Check for the role type, if multiple rate codes are maintained for the month
			 * then those months claim will be settled separately, no need to handle in the application
			 * Author : Pankaj Mishra
			 */
			if (claimType === "102") {
				var month;
				var year;
				this.getRateTypesAndRateAmount(month, year, ulu, fdlu, claimType);
				var aElligibleRateType = this.AppModel.getProperty("/claimRequest/createClaimRequest/RateTypeDetails");
				var aDistinctRateCode = [];
				for (var t = 0; t < aElligibleRateType.length; t++) {
					if (aDistinctRateCode.indexOf(aElligibleRateType[t].RateTypeCode) === -1) {
						aDistinctRateCode.push(aElligibleRateType[t].RateTypeCode);
					}
				}
				if (aDistinctRateCode.length > 1) {
					MessageBox.error(this.getI18n("CW.multipleRateCodesError"));
					this.hideBusyIndicator();
					return;
				}

			}

			services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				this.AppModel.setProperty("/claimRequest/existingDraftRequestsList", oData.getSource().getProperty(
					"/claimDataResponse/eclaimsData"));
				this._fnHandleExistDraftPlanning();
			}.bind(this));
		},

		_fnHandleExistDraftPlanning: function () {
			var that = this;
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
			var isProceedToNextScreen;
			var aExistingDraftRequestsList = this.AppModel.getProperty("/claimRequest/existingDraftRequestsList");
			if (aExistingDraftRequestsList) {
				if (aExistingDraftRequestsList.length) {
					if (claimType === "103" || claimType === "104") {
						MessageBox.error("You have another claim with a Draft status. Please proceed with it.");
						that.getView().byId("itb1").setSelectedKey("Draft");
						that.closeClaimTypeDialog();
						this.hideBusyIndicator();
					} else {
						MessageBox.confirm("You have another claim with a Draft status. Do you want to create a new claim?", {
							title: "Confirmation",
							onClose: function (oAction) {
								if (oAction === "OK") {
									that.confirmAction();
								}
								if (oAction === "CANCEL") {
									that.getView().byId("itb1").setSelectedKey("Draft");
									that.closeClaimTypeDialog();
									this.hideBusyIndicator();
								}
							}.bind(this)
						});
					}

				} else {
					isProceedToNextScreen = 'X';
				}
			} else {
				isProceedToNextScreen = 'X';

			}
			if (isProceedToNextScreen) {
				this.confirmAction();
			}
		},

		//	navToExistingClaimRequest: function (oAction) {},

		onExportMassUploadResponse: function () {
			var aCols, aRows, oSettings, oSheet;
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			if (claimType === "103" || claimType === "104") {
				aCols = MassUploadHelper._createColumnConfigOvertimeEA_NonEA();
			} else if (claimType === "102") {
				aCols = MassUploadHelper._createColumnConfigOvertimeCW();
			} else {
				aCols = MassUploadHelper._createColumnConfig();
			}

			aRows = this.AppModel.getProperty("/claimRequest/createClaimRequest/massUploadResponseDisplay");

			oSettings = {
				workbook: {
					columns: aCols,
					context: {
						//  title: 'Some random title',
						//  modifiedBy: 'John Doe',
						sheetName: "Claim Details"

					}
				},
				dataSource: aRows,
				fileName: "MassUploadResponse.xlsx"
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					MessageToast.show('Claim Data downloaded successfully!');
				})
				.finally(oSheet.destroy);
		},

		onMessagePopoverPress: function (oEvent) {
			MassUploadHelper._onMessagePopoverPress(oEvent, this);
		},
		onSubmitMassUploadAfterValidation: function () {
			this.showBusyIndicator();
			var aRequestPayload = this.AppModel.getProperty("/claimRequest/createClaimRequest/massUploadRequestPayload");
			var aPayload = [];
			for (var i = 0; i < aRequestPayload.length; i++) {
				var oRequestPayload = aRequestPayload[i];
				if (!oRequestPayload.ERROR_STATE) {
					aPayload.push(oRequestPayload);
				} else {
					continue;
				}
			}

			if (aPayload.length) {
				MassUploadHelper._fnPostMassSubmission(aPayload, this);
			} else {
				MessageBox.error("There are no records to submit!");
				this.hideBusyIndicator();
				return;
			}

		},

		onPressProcessInstance: function (oEvent) {
			ProcessInstanceFlow._onPressProcessInstance(oEvent, this);
		},
		onPressCloseProcessNode: function () {
			ProcessInstanceFlow._onPressCloseProcessNode(this);
		},
		onPressFilterButton: function () {
			var visibleSearchField = this.AppModel.getProperty("/showSearchField");
			if (visibleSearchField) {
				this.AppModel.setProperty("/showSearchField", false);
			} else {
				this.AppModel.setProperty("/showSearchField", true);
			}
		},
		onPressDeleteClaim: function (oEvent) {
			var that = this;
			var sPath = oEvent.getSource().getBindingContext("EclaimSrvModel").getPath();
			var objData = oEvent.getSource().getModel("EclaimSrvModel").getProperty(sPath);
			var serviceUrl = Config.dbOperations.deleteClaim;
			var oHeaders = Utility._headerToken(this);
			var aParameter = [{
				"DRAFT_ID": objData.DRAFT_ID
			}];
			MessageBox.confirm(
				"Please confirm to delete ?", {
					icon: "sap-icon://question-mark",
					title: "Confirmation",
					actions: [sap.m.MessageBox.Action.DELETE, sap.m.MessageBox.Action.CANCEL],
					emphasizedAction: MessageBox.Action.DELETE,
					onClose: function (oAction) {
						if (oAction === sap.m.MessageBox.Action.DELETE) {
							services._loadDataUsingJsonModel(serviceUrl, aParameter, "POST", oHeaders, function (oData) {
								var selectedKey = 'Draft';
								this.AppModel.setProperty("/iconTabBarSelectedKey", selectedKey);
								this.AppModel.setProperty("/prevSelectedKeyOfIconTabBar", selectedKey);
								sap.ui.getCore().getModel("DashboardParameterModel").setProperty("/key",selectedKey);
								// this.getView().byId("itb1").setSelectedKey(selectedKey);
								if (!oData.getSource().getData().error) {
									MessageBox.success(oData.getSource().getData().message);
									this._fnReadAfterMetadataLoaded(this.getOwnerComponent().getModel("EclaimSrvModel"));
								} else {
									MessageBox.error(oData.getSource().getData().message);
								}
							}.bind(this));
							// sap.m.MessageToast.show(box.getModel().getProperty('/message'));
						}
					}.bind(this)
				}
			);

		},
		handleSearchStaff: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			this.handleValueHelpStaff(null, sValue);
		},

		onPressUnlockRequest: function (oEvent) {

			var draftId = oEvent.getSource().getBindingContext("EclaimSrvModel").getObject().DRAFT_ID;
			this._fnRequestUnLockHandling(draftId);
		},

		_fnRequestUnLockHandling: function (draftId) {
			if (!!this.AppModel) {
				sap.ushell.Container.detachLogoutEvent(function (oLogOff) {}.bind(this));
				this.AppModel.setProperty("/claimRequest/createClaimRequest/requestLocked", 'Y');
				ClaimTypeDataHandling._handleLocking(this, this.getI18n("ClaimDetail.UnLock"), draftId,
					Utility._fnHandleStaffId(this),
					function (oData) {
						if (oData.getParameter("success") && (!oData.getSource().getProperty("/").error)) {
							this.AppModel.setProperty("/claimRequest/createClaimRequest/requestLocked", '')
							MessageToast.show("Request Unlocked successfully");
							this.onRefreshClaimRequestsNcounts();
						} else {
							MessageBox.show("Error in locking");
						}
					}.bind(this));
			}
		},
	});
});