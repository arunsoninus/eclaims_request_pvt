sap.ui.define([
	"../controller/BaseController", "../extensions/extendedvaluehelp", "sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"../utils/dataformatter", "../utils/massuploadhelper", "sap/m/MessageToast", "sap/m/MessageBox", "../utils/services",
	"../utils/appconstant",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"../utils/handlingVisibilityClaimDetailView",
	"../utils/utility",
	"../utils/configuration",
	"../utils/claimTypeDataHandling",
	"../utils/validation",
	"../utils/changeEventHandling",
	"sap/ui/core/routing/History",
	"sap/ui/model/Sorter"
], function (BaseController, ExtendedValueHelp, Fragment, JSONModel, Formatter, MassUploadHelper, MessageToast, MessageBox, services,
	AppConstant, Filter, FilterOperator, FilterType, HandlingVisibilityClaimDetailView, Utility, Config, ClaimTypeDataHandling, validation,
	ChangeEventHandling, History, Sorter) {
	"use strict";

	return BaseController.extend("nus.edu.sg.claimrequest.controller.ClaimDetailView", {
		formatter: Formatter,
		_fnRefreshAttachment: function () {
			var oView = this.getView();
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var draftId = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
			var aFilter = [];

			var andFilter = [];
			andFilter.push(new sap.ui.model.Filter("SOURCE_TYPE", FilterOperator.EQ, '144'));

			andFilter.push(new sap.ui.model.Filter("REFERENCE_ID", FilterOperator.EQ, draftId));
			andFilter.push(new Filter("IS_DELETED", FilterOperator.EQ, 'N'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			EclaimSrvModel.read("/AttachmentsDatas", {
				filters: aFilter,
				success: function (oData) {
					if (oData.results.length) {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/attachmentList", oData);
					} else {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/attachmentList/results", []);
					}
				}.bind(this),
				error: function (oError) {

				}
			});
		},
		handleFileSizeExceed: function () {
			return MessageBox.error(this.getI18n("AttachmentSizeValidationMessage"));
		},
		onUploadChange: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			var serviceUrl = Config.dbOperations.uploadAttachment;
			var draftId = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			let disallowedCharsRegex = /^[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/;
			if (oEvent.getSource().oFileUpload.files.length) {
				this.showBusyIndicator();
				var file = oEvent.getSource().oFileUpload.files[0];
				if (file.size > 5000000) {
					this.hideBusyIndicator();
					return MessageBox.error("Maximum file size of 5 MB is allowed to upload.");
				} else if (disallowedCharsRegex.test(file.name)) {
					this.hideBusyIndicator();
					return MessageBox.error("Please check the file name guidelines.");
				}

				var form = new FormData();
				form.append("files", file, file.name);
				form.append("processCode", claimType);
				form.append("draftId", draftId);
				form.append("fileName", file.name);
				//added role as well
				var role = this.AppModel.getProperty("/userRole");
				if (role === 'ESS') {
					role = 'CLAIMANT';
				} else if (role === 'CA') {
					role = 'CLAIM_ASSISTANT';
				}
				form.append("role", role);

				var oHeaders = Utility._headerToken(this);
				delete oHeaders["Content-Type"];
				var settings = {
					"url": serviceUrl,
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
						var oResponse = JSON.parse(response);
						if (oResponse.status === "S") {
							this._fnRefreshAttachment();
						} else {
							MessageBox.error(oResponse.message);
						}
						console.log(response);
					}.bind(this))
					.fail(function (response) {
						var parseResponse = JSON.parse(response.responseText);
						if (parseResponse.error) {
							MessageBox.error(parseResponse.message);
						}
						// alert("error");
					}.bind(this))
					.always(function () {
						this.hideBusyIndicator();
					}.bind(this));

			}

		},
		handleUploadComplete: function () {
			this._fnRefreshAttachment();
		},
		onUploadDocument: function (oEvent) {
			var oUploader = this.getView().byId("UploadSet");
			var aIncompletedItems = oUploader.getIncompleteItems();
			var serviceUrl = Config.dbOperations.uploadAttachment;

			for (var t = 0; t < aIncompletedItems.length; t++) {
				var oIncompletedItems = aIncompletedItems[t];

			}
		},
		onInit: function () {
			//		this.showBusyIndicator();  //added on 21 Feb to ensure unless everything loads screen is blocked
			this.oOwnerComponent = this.getOwnerComponent();
			this.oRouter = this.oOwnerComponent.getRouter();
			this.oModel = this.oOwnerComponent.getModel();
			if (this.oRouter) {
				if (this.oRouter.getRoute("detail")) {
					//handling navigation for detail page
					this.oRouter.getRoute("detail").attachPatternMatched(this._onProjectMatched, this);
				}
				if (this.oRouter.getRoute("taskdetail")) {
					//handling navigation for the task detail page
					this.oRouter.getRoute("taskdetail").attachPatternMatched(this._taskInboxLoad, this);
				}
				//handling navigation for the Claim Workflow Report in Display mode
				if (this.oRouter.getRoute("displaydetail")) {
					this.oRouter.getRoute("displaydetail").attachPatternMatched(this._onClaimReportMatched, this);
				}
			}
		},
		_flpBackBtn: function (oEvent) {
			var isFlpBackButtonPressed = this.AppModel.getProperty("/isFlpBackButtonPressed");
			if (isFlpBackButtonPressed != 'Y') {
				var reqStatus = this.AppModel.getProperty("/claimRequest/createClaimRequest/reqStatus");
				if (reqStatus === '01' && this.viaRequestorForm) { //added RequestorForm flag condition on 13 March to ensure save happens only when back happens from Req. form
					var saveSource = 'onCloseSaveCall';
					this.onPressSaveDraftRequest(saveSource, null, false);
				}
				this.AppModel.setProperty("/isFlpBackButtonPressed", 'Y');
			}

			if ((this.viaRequestorForm || this.viaInbox) && !this.firstTimeUnlockRequest) {
				this.firstTimeUnlockRequest = true;
				this._fnRequestLockHandling();
			}
			this.runAutoSave = false; //stop auto save
			// if (this.autoSaveTrigger) {
			// 	this.autoSaveTrigger.setInterval(0);
			// }
			//this.checkUserConfirmationForSave(); 
			//setTimeout(this.checkUserConfirmationForSave(), 1000);
			sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);

		},
		_fnLogOut: function () {
			this._fnRequestLockHandling();
			// sap.ushell.Container.detachLogoutEvent(this._fnLogOut());
		},

		_taskInboxLoad: function (oEvent) {
			//	this.showBusyIndicator(); //added on 21 Feb to ensure unless everything loads screen is blocked
			//attach the press event to the fiori launchpad back button
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}
			sap.ushell.Container.attachLogoutEvent(function (oLogOff) {
				this._fnRequestLockHandling();
			}.bind(this), false);
			//get draft Id
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			this.taskId = oEvent.getParameter("arguments").taskId;
			this.taskName = oEvent.getParameter("arguments").taskName;
			this.viaInbox = true;
			//added on 13 March 
			this.firstTimeUnlockRequest = false;
			this._fnInitializeAppModel();
		},

		/**
		 * Invoke at every point of Project Navigation
		 */
		_onProjectMatched: function (oEvent) {
			//		this.showBusyIndicator(); //added on 21 Feb to ensure unless everything loads screen is blocked
			//attach the press event to the fiori launchpad back button
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}
			//begin of change on 13 March to release lock while logging off from detailview 	
			sap.ushell.Container.attachLogoutEvent(function (oLogOff) {
				this._fnRequestLockHandling();
			}.bind(this), false);
			//end of change on 13 March to release lock	while logging off from detailview 		
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			//begin of change on 13 March to set the flag when detailview is called from Requestor Form			
			this.viaRequestorForm = true;
			this.firstTimeUnlockRequest = false;
			//end of change on 13 March to set the flag when detailview is called from Requestor Form				
			this._fnInitializeAppModel();
		},

		_onClaimReportMatched: function (oEvent) {
			//	this.showBusyIndicator(); //added on 21 Feb to ensure unless everything loads screen is blocked
			//attach the press event to the fiori launchpad back button
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			this.viaClaimReport = true;
			this._fnInitializeAppModel();
		},

		_fnInitializeAppModel: function () {
			this.showBusyIndicator(); //added on 21 Feb to ensure unless everything loads screen is blocked
			this.AppModel = this.getComponentModel("AppModel");
			var oAppModel = this.setComponentModel("AppModel");
			oAppModel.setData(AppConstant);
			this.AppModel = oAppModel;
			this._fnClearAppModel();
			this.generateTokenForLoggedInUser();
			//	this.hideBusyIndicator(); //added on 21 Feb to ensure unless everything loads screen is blocked
		},

		setVisibility: function (sourceReq, requestData) {
			HandlingVisibilityClaimDetailView._fnSetVisibility(this, sourceReq, requestData);
		},

		generateTokenForLoggedInUser: function () {
			services.fetchLoggedUserToken(this, function (oRetData) {
				Utility._assignTokenAndUserInfo(oRetData, this);
				this._fetchAuthToken();
			}.bind(this));

		},
		_fetchAuthToken: function () {

			var serviceName = Config.dbOperations.metadataClaims;
			var oHeaders = Utility._headerToken(this);
			var oDataModel = new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: serviceName,
				headers: oHeaders
			});
			oDataModel.setUseBatch(false);
			oDataModel.metadataLoaded().then(function () {
				this.getOwnerComponent().setModel(oDataModel, "EclaimSrvModel");
				//fetch holidays
				var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
				var filterHoliday = []; //Utility._generateFilter("NUSNET_ID", [staffId]);
				var serviceUrl = Config.dbOperations.fetchChrsHolidays;
				services._readDataUsingOdataModel(serviceUrl, EclaimSrvModel, this, filterHoliday, function (oData) {
					this.AppModel.setProperty("/holidayList", oData.results);
					if (this._project !== "NEW") {
						this._fnGetClaimData(oDataModel);
						//	this.settingUluFdluValues();  commented on 26 Feb 23 as ULU and FDLU is populated from _fnGetClaimData
						//Start of changes to make all the buttons disable if the detail view is called from Claim Report			
						if (this.viaClaimReport === true) {
							this.settingVisibilityToFalse();
						}
						//End			
					} else {
						if (this.AppModel.getProperty("/userRole") === 'ESS') {
							var staffId = Utility._fnHandleStaffId(this);
						} else {
							//staffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
							staffId = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/STAFF_ID");
						}
						if (this.AppModel.getProperty("/userRole") === 'CA') {
							var requestorGroup = 'CLAIM_ASSISTANT';
							this._fnFetchTasksConfigs(requestorGroup);
							this._fnFetchApproverForCA();
						}
						this.AppModel.setProperty("/claimRequest/createClaimRequest/claimantStaffId", staffId);
						this.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", []);
						this._fnFetchUserDetailFromChrsJobInfo(staffId);
						Utility._fnGetBankNCostDisDetails(this);
					}
					this.initializeModel(this._project);
				}.bind(this));
			}.bind(this));
		},
		_handleAutoSave: function () {
			this.autoSaveTrigger = new sap.ui.core.IntervalTrigger();
			//set the interval of 5 mins between auto save
			this.autoSaveTrigger.setInterval(300000);
			this.autoSaveTrigger.addListener(function () {

				var draftID = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
				this.runAutoSave = false;
				if (this.runAutoSave && draftID) {
					if (Utility.checkForLastRun(this.lastSuccessRun)) {
						var saveSource = 'onAutoSave';
						// this.onPressSaveDraftRequest(saveSource, null, false);
					}
				} else {
					return;
				}

			}.bind(this));
		},

		_fnGetClaimData: function () {
			this.showBusyIndicator();
			var that = this;
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var requestData = EclaimSrvModel.getProperty("/" + this._project);
			EclaimSrvModel.read("/" + this._project, {
				urlParameters: {
					"$expand": "RemarksDataDetails,TaskActionConfigViewDetails,RequestLockDetailsDetails,AttachmentsDataDetails"
				},
				success: function (oData) {
					requestData = oData;
					var userRole = this.AppModel.getProperty("/userRole");
					var claimedMonth = requestData.CLAIM_MONTH - 1;
					this.AppModel.setProperty("/claimRequest/createClaimRequest/minDateMonth", new Date(requestData.CLAIM_YEAR, claimedMonth, 1));
					this.AppModel.setProperty("/claimRequest/createClaimRequest/maxDateMonth", new Date(requestData.CLAIM_YEAR, claimedMonth + 1,
						0));
					this.AppModel.setProperty("/claimRequest/createClaimRequest/WORKING_HOURS", requestData.WORKING_HOURS);
					// this.AppModel.setProperty("/claimRequest/createClaimRequest/attachmentList", requestData.AttachmentsDataDetails);
					var claimMonthName = Formatter.convertMonthcodeToName(requestData.CLAIM_MONTH, requestData.CLAIM_YEAR);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/monthName", claimMonthName);
					var ulu = requestData.ULU;
					var fdlu = requestData.FDLU;
					//
					//	if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelected")) {
					that.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", requestData.ULU_T);
					//	}
					//		if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode")) {
					that.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", requestData.ULU);
					//		}
					//		if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelected")) {
					that.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", requestData.FDLU_T);
					//		}
					//		if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode")) {
					that.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", requestData.FDLU);
					//		}
					//					

					this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRequestType", requestData.CLAIM_REQUEST_TYPE);
					//	this.AppModel.setProperty("/claimRequest/createClaimRequest/claimantNusNetId", requestData.STAFF_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/claimantStaffId", requestData.STAFF_ID); //added on 20 Feb to remove NETID dependency
					Utility._fnGetBankNCostDisDetails(this);
					this.getRateTypesAndRateAmount(requestData.CLAIM_MONTH, requestData.CLAIM_YEAR, ulu, fdlu, requestData.CLAIM_TYPE);
					that.AppModel.setProperty("/claimRequest/createClaimRequest/draftId", requestData.DRAFT_ID);

					//added by Pankaj on 17/03/2023
					sap.ui.getCore().AppContext.SelectedDraftID = requestData.DRAFT_ID;

					that.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", requestData.STATUS_ALIAS);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/actSelMonYearInNo", requestData.CLAIM_MONTH + "-" + requestData.CLAIM_YEAR);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/claimType", requestData.CLAIM_TYPE);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/reqStatus", requestData.REQUEST_STATUS);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/requestId", requestData.REQUEST_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", []);
					this._fnRefreshAttachment();
					//	this._fnFetchUserDetailFromChrsJobInfo(requestData.STAFF_NUSNET_ID);
					this._fnFetchUserDetailFromChrsJobInfo(requestData.STAFF_ID);
					//make a call to TasksConfigs in order to get the Mandatory parameters
					if (userRole === 'CA') {
						this._fnFetchTasksConfigs(requestData.REQUESTOR_GRP);
						this._fnFetchApproverForCA();
					}
					this.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeDesc", requestData.CLAIM_TYPE_T);

					//handling locking
					if ((requestData.LOCKED_BY_USER_NID !== this.AppModel.getProperty("/loggedInUserId")) && requestData.IS_LOCKED === "X") {
						Utility._fnAppModelSetProperty(this, "/isClaimLocked", true);
						Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", "Task is already locked by user".concat(" : ", requestData.LOCKED_BY_USER_NID));
					} else {
						Utility._fnAppModelSetProperty(this, "/isClaimLocked", false);
						Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", "");
					}

					//end of handling locking

					this.AppModel.setProperty("/showSaveButton", false);
					this.AppModel.setProperty("/showSubmitButton", false);
					this.AppModel.setProperty("/showWithdrawButton", false);
					this.AppModel.setProperty("/showRetractButton", false);
					this.AppModel.setProperty("/showCheckButton", false);
					this.AppModel.setProperty("/showRejectButton", false);
					this.AppModel.setProperty("/showVerifyButton", false);
					this.AppModel.setProperty("/showApproveButton", false);

					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME", requestData.VERIFIER_STAFF_FULL_NAME);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID", requestData.VERIFIER_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_ID", requestData.VERIFIER_STAFF_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_PPNT_ID", requestData.VERIFIER_PPNT_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME", requestData.ADDITIONAL_APP_2_STAFF_FULL_NAME);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID", requestData.ADDITIONAL_APP_2_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID", requestData.ADDITIONAL_APP_2_STAFF_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_PPNT_ID", requestData.ADDITIONAL_APP_2_PPNT_ID);

					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME", requestData.ADD_APP_1_STAFF_FULL_NAME);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID", requestData.ADD_APP_1_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID", requestData.ADD_APP_1_STAFF_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_PPNT_ID", requestData.ADD_APP_1_PPNT_ID);

					//uncomment later once Dinesh does association for Remarkdatadetails
					var remarkItems = requestData.RemarksDataDetails.results;
					this.AppModel.setProperty("/claimRequest/createClaimRequest/REMARKS", requestData.RemarksDataDetails.results);
					this.setVisibility(null, requestData); //call this for non new project case i.e. reading the existing request
					that.claimItemDetails(that._project, EclaimSrvModel);
					this.fetchAggHoursDayTypeViewDetails(that._project, EclaimSrvModel);
					this.manageRequestActions(requestData.TaskActionConfigViewDetails.results, requestData.REQUESTOR_GRP, requestData.REQUEST_STATUS,
						userRole);

					//handle locking
					// Utility.handlingSession(this);
					var AppModel = this.AppModel.getProperty("/");
					//Changes on 21 March by Rishi
					//auto save to happen if req status is '01'and if the call is from requestor form only
					// if (this.viaRequestorForm && AppModel.claimRequest.createClaimRequest.reqStatus === '01') {
					// 	this.runAutoSave = true;
					// 	this._handleAutoSave();
					// }
					//begin of change on 13 March - 
					this.AppModel.setProperty("/claimRequest/createClaimRequest/requestLocked", '');
					//to lock request only for Requestor Form and Inbox case and if it not a draft request
					if ((this.viaRequestorForm || this.viaInbox) && userRole === 'CA') {
						if ((AppModel.claimRequest.createClaimRequest.reqStatus === '02') ||
							(AppModel.claimRequest.createClaimRequest.reqStatus === '16') ||
							(AppModel.claimRequest.createClaimRequest.reqStatus === '18') ||
							(AppModel.claimRequest.createClaimRequest.reqStatus === '19')) {
							ClaimTypeDataHandling._handleLocking(this, this.getI18n("ClaimDetail.Lock"), AppModel.claimRequest.createClaimRequest.draftId,
								Utility._fnHandleStaffId(this),
								function (oData) {
									//begin of change on 28 March									
									// if (oData.error) {
									// 	MessageBox.show(oData.message);
									// }

									if (!oData.getParameter("success")) {
										MessageBox.show(oData.getSource().getProperty("/").message);
									} else if (oData.getParameter("success") && (!oData.getSource().getProperty("/").error)) {
										//Request Locked successfully
										this.AppModel.setProperty("/claimRequest/createClaimRequest/requestLocked", 'Y');
									}
									//end of change on 28 March									
								}.bind(this));
						}
					}
					//end of change on 13 March - to lock request only for Requestor Form and Inbox case						
					this.hideBusyIndicator();
				}.bind(this),
				error: function (oError) {
					this.hideBusyIndicator();
				}.bind(this)

			});

		},
		manageRequestActions: function (taskConfigDetails, requestorGroup, requestStatus, userRole) {
			this.AppModel.setProperty("/showSubmitButton", false);
			this.AppModel.setProperty("/showSaveButton", false);
			this.AppModel.setProperty("/showVerifyButton", false);
			this.AppModel.setProperty("/showRejectButton", false);
			this.AppModel.setProperty("/showApproveButton", false);
			this.AppModel.setProperty("/showRetractButton", false);
			this.AppModel.setProperty("/showCheckButton", false);
			//Check if the Request is Accessed from Inbox
			if (this.viaInbox && this.taskName && this.taskId) {
				var currentTask = [];
				jQuery.sap.each(taskConfigDetails, function (t, actionElement) {
					if (actionElement.TASK_STATUS === this.getI18n("ActiveTask") && actionElement.TASK_NAME === this.taskName) {
						currentTask.push(actionElement);
					}
				}.bind(this));

				//Current Task is Active
				if (currentTask.length > 0) {
					for (var i = 0; i < currentTask.length; i++) {
						var item = currentTask[i];
						var taskActionSetItem = {};
						if (item.TASK_STATUS != '95' || requestorGroup != item.REQUESTOR_GRP) {
							continue;
						}
						// if (item.REQUESTOR_GRP === requestData.REQUESTOR_GRP) {
						if (item.ACTION_NAME === "Check" && userRole === 'CA') {
							this.AppModel.setProperty("/showCheckButton", true);
							this.AppModel.setProperty("/showSaveButton", true);
						}
						if (item.ACTION_NAME === "Verify" && userRole === 'VERIFIER') {
							this.AppModel.setProperty("/showVerifyButton", true);
							this.AppModel.setProperty("/showSaveButton", true);
						}
						if ((item.ACTION_NAME === "Approve") && (userRole === 'ADDITIONAL_APP_1' || userRole === 'ADDITIONAL_APP_2' || userRole ===
								'APPROVER' || userRole === 'REPORTING_MGR')) {
							this.AppModel.setProperty("/showApproveButton", true);
							this.AppModel.setProperty("/showSaveButton", true);
						}
						if (item.ACTION_NAME === "Reject") {
							if (userRole === 'CA' && item.TASK_NAME === "CLAIM_ASSISTANT" && requestStatus !== '08' && requestStatus !==
								'18' && requestStatus !==
								'17') { //&& this.AppModel.getProperty("/showCheckButton")) {
								this.AppModel.setProperty("/showRejectButton", true);
								this.AppModel.setProperty("/showSaveButton", true);
							}
							if (userRole === 'VERIFIER' && item.TASK_NAME === "VERIFIER") { // && this.AppModel.getProperty("/showVerifyButton")) {
								this.AppModel.setProperty("/showRejectButton", true);
								this.AppModel.setProperty("/showSaveButton", true);
							}
							if ((userRole === 'ADDITIONAL_APP_1' || userRole === 'ADDITIONAL_APP_2' || userRole === 'APPROVER' || userRole ===
									'REPORTING_MGR') && (item.TASK_NAME ===
									'ADDITIONAL_APP_1' || item.TASK_NAME === 'ADDITIONAL_APP_2' || item.TASK_NAME === 'APPROVER' || item.TASK_NAME ===
									'REPORTING_MGR')) { // && this.AppModel.getProperty("/showApproveButton")) {
								this.AppModel.setProperty("/showRejectButton", true);
								this.AppModel.setProperty("/showSaveButton", true);
							}
						}
						if (item.ACTION_NAME === "Request Resubmit" && userRole === 'CA') {
							this.AppModel.setProperty("/showSubmitButton", true);
							this.AppModel.setProperty("/showSaveButton", true);
						}
					}
				}
			} else if (this.viaClaimReport) {
				//Handle Button Visibility if the Request is accessed from Claim Report
				this.AppModel.setProperty("/showSubmitButton", false);
				this.AppModel.setProperty("/showSaveButton", false);
				this.AppModel.setProperty("/showVerifyButton", false);
				this.AppModel.setProperty("/showRejectButton", false);
				this.AppModel.setProperty("/showApproveButton", false);
				this.AppModel.setProperty("/showRetractButton", false);
				this.AppModel.setProperty("/showCheckButton", false);

				this.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
				this.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
				this.AppModel.setProperty("/visibility/ClaimDetailView/UluFdluSelection", false);

				this.AppModel.setProperty("/enable/ClaimDetailView/ADD_1_SRCH_HELP", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/VERIFIER_SRCH_HELP", false);
				this.AppModel.setProperty("/enable/ClaimDetailView/WBS", false);
			} else { // Request Accessed by CA or Claimant

				switch (requestStatus) {
				case "01":
					if (userRole === this.getI18n("Claimant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showSubmitButton", true);
					} else if (userRole === this.getI18n("ClaimAssistant") && requestorGroup === this.getI18n("CA.User.Group")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showSubmitButton", true);
					}
					break;
				case "02":
					if (userRole === this.getI18n("ClaimAssistant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showRejectButton", true);
						this.AppModel.setProperty("/showCheckButton", true);
					} else if (userRole === this.getI18n("Claimant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
						this.AppModel.setProperty("/showRetractButton", true);
					}
					break;
				case "03":
				case "04":
				case "05":
				case "06":
					if (userRole === this.getI18n("Claimant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
						this.AppModel.setProperty("/showRetractButton", true);
					} else if (userRole === this.getI18n("ClaimAssistant")) //&& requestorGroup === this.getI18n("CA.User.Group")) 
					{
						var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
						if (claimType === '101') {
							this.AppModel.setProperty("/showRetractButton", true);
						} else {
							if (requestorGroup === this.getI18n("CA.User.Group")) {
								this.AppModel.setProperty("/showRetractButton", true);
							} else {
								this.AppModel.setProperty("/showRetractButton", false);
							}
						}

					}
					break;
				case "07":
					if (userRole === this.getI18n("Claimant")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showSubmitButton", true);
					}
					break;
				case "08":
				case "18":
					if (userRole === this.getI18n("ClaimAssistant")) {
						if (requestorGroup === this.getI18n("Claimant.User.Group")) {
							this.AppModel.setProperty("/showSaveButton", true);
							this.AppModel.setProperty("/showRejectButton", true);
							this.AppModel.setProperty("/showCheckButton", true);
						} else if (requestorGroup === this.getI18n("CA.User.Group")) {
							this.AppModel.setProperty("/showSaveButton", true);
							this.AppModel.setProperty("/showSubmitButton", true);
						}
					}
					break;
				case "16":
					if (userRole === this.getI18n("ClaimAssistant")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showRejectButton", true);
						this.AppModel.setProperty("/showCheckButton", true);
					}
					break;
				case "15":
					if (userRole === this.getI18n("Claimant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showSubmitButton", true);
					}
					break;
				case "17":
					if (userRole === this.getI18n("ClaimAssistant") && requestorGroup === this.getI18n("CA.User.Group")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showSubmitButton", true);
					}
					break;
					//Added case for 19(When Super Admin Retracts)
				case "19":
					// if (userRole === this.getI18n("ClaimAssistant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
					if (userRole === this.getI18n("ClaimAssistant")) {
						this.AppModel.setProperty("/showSaveButton", true);
						this.AppModel.setProperty("/showRejectButton", true);
						this.AppModel.setProperty("/showCheckButton", true);
					} else if (userRole === this.getI18n("Claimant") && requestorGroup === this.getI18n("Claimant.User.Group")) {
						this.AppModel.setProperty("/showRetractButton", true);
					}
					break;
				}

			}
		},

		_fnFetchUserDetailFromChrsJobInfo: function (staffId) {
			this.showBusyIndicator();
			var that = this;
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			//	var filters = that.generateFilter("NUSNET_ID", [nusNetId]);
			var filters = that.generateFilter("STF_NUMBER", [staffId]);
			var andFilter = [];
			var aFilter = [];
			var aSorter = [];
			aSorter.push(new Sorter({
				path: "START_DATE_CAL ",
				descending: true
			}));
			var currentDate = new Date();
			andFilter.push(new sap.ui.model.Filter("STF_NUMBER", FilterOperator.EQ, staffId));
			// andFilter.push(new sap.ui.model.Filter("START_DATE_CAL", FilterOperator.LE, currentDate));
			// andFilter.push(new sap.ui.model.Filter("END_DATE_CAL", FilterOperator.GE, currentDate));
			andFilter.push(new sap.ui.model.Filter("EMPL_STS_C", FilterOperator.EQ, 'A'));
			andFilter.push(new sap.ui.model.Filter("ULU_C", FilterOperator.EQ, this.AppModel.getProperty(
				"/claimRequest/createClaimRequest/uluSelectedCode")));
			andFilter.push(new sap.ui.model.Filter("FDLU_C", FilterOperator.EQ, this.AppModel.getProperty(
				"/claimRequest/createClaimRequest/fdluSelectedCode")));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			EclaimSrvModel.read("/ChrsJobInfos", {
				filters: aFilter,
				sorter: aSorter,
				success: function (oData) {
					if (oData.results.length) {
						if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/STAFF_FULL_NAME")) {
							that.AppModel.setProperty("/claimRequest/createClaimRequest/FULL_NM", oData.results[0].FULL_NM);
							that.AppModel.setProperty("/claimRequest/createClaimRequest/STF_NUMBER", oData.results[0].STF_NUMBER);
						} else {
							that.AppModel.setProperty("/claimRequest/createClaimRequest/FULL_NM", that.AppModel.getProperty(
								"/claimRequest/createClaimRequest/staffList/0/STAFF_FULL_NAME"));
							that.AppModel.setProperty("/claimRequest/createClaimRequest/STF_NUMBER", that.AppModel.getProperty(
								"/claimRequest/createClaimRequest/staffList/0/STAFF_ID"));
						}
						that.AppModel.setProperty("/claimRequest/createClaimRequest/FDLU_T", oData.results[0].FDLU_T);
						that.AppModel.setProperty("/claimRequest/createClaimRequest/FDLU_C", oData.results[0].FDLU_C);
						that.AppModel.setProperty("/claimRequest/createClaimRequest/ULU_T", oData.results[0].ULU_T);
						that.AppModel.setProperty("/claimRequest/createClaimRequest/ULU_C", oData.results[0].ULU_C);

						//get wbs for new claim
						Utility._fnGetWbs(that);

						//	if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/uluPrimary")) {
						that.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimary", oData.results[0].ULU_T);
						//	}
						//	if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/uluPrimaryCode")) {
						that.AppModel.setProperty("/claimRequest/createClaimRequest/uluPrimaryCode", oData.results[0].ULU_C);
						//	}
						//	if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/fdluPrimary")) {
						that.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimary", oData.results[0].FDLU_T);
						//	}
						//	if (!that.AppModel.getProperty("/claimRequest/createClaimRequest/fdluPrimaryCode")) {
						that.AppModel.setProperty("/claimRequest/createClaimRequest/fdluPrimaryCode", oData.results[0].FDLU_C);
						//	}

						that.AppModel.setProperty("/claimRequest/createClaimRequest/EMP_GP_T", oData.results[0].EMP_GP_T);
						that.AppModel.setProperty("/claimRequest/createClaimRequest/EMP_GP_C", oData.results[0].EMP_GP_C);
						var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
							pattern: "d MMM, yyyy"
						});
						var dojDate = oDateFormat.format(new Date(oData.results[0].JOIN_DATE));
						that.AppModel.setProperty("/claimRequest/createClaimRequest/JOIN_DATE", dojDate);
						that.AppModel.setProperty("/claimRequest/createClaimRequest/ACTUAL_JOIN_DATE_FORMAT", oData.results[0].JOIN_DATE);
						var sLeavingDate = "";
						if (oData.results.length > 1) {
							if (!oData.results[0].LEAVING_DATE) {
								oData.results[0].LEAVING_DATE = oData.results[0].END_DATE;
							}
							sLeavingDate = oData.results[0].LEAVING_DATE;
							for (var x = 1; x < oData.results.length; x++) {
								if (!oData.results[x].LEAVING_DATE) {
									oData.results[x].LEAVING_DATE = oData.results[x].END_DATE;
								}
								if (sLeavingDate < oData.results[x].LEAVING_DATE) {
									sLeavingDate = oData.results[x].LEAVING_DATE;
								}
							}
						} else if (!oData.results[0].LEAVING_DATE) {
							// that.AppModel.setProperty("/claimRequest/createClaimRequest/LEAVING_DATE", '9999-12-31');
							sLeavingDate = oData.results[0].END_DATE;
						} else {
							// that.AppModel.setProperty("/claimRequest/createClaimRequest/LEAVING_DATE", oData.results[0].LEAVING_DATE);
							sLeavingDate = oData.results[0].LEAVING_DATE;
						}

						that.AppModel.setProperty("/claimRequest/createClaimRequest/LEAVING_DATE", sLeavingDate);

						services.fetchPhotoOfUser(that, oData.results[0].STF_NUMBER);
						var claimType = that.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
						//	var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_C");
						if (claimType !== '101') {
							that.leaveDetails();
							if (claimType === '102') {
								if (this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === '18') {
									this.populateClaimDatesForClaimTypeCw();
								}
							}
						}

					} else {
						that.AppModel.setProperty("/claimRequest/createClaimRequest/FULL_NM", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/STF_NUMBER", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/FDLU_T", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/FDLU_C", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/ULU_T", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/ULU_C", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelected", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/uluSelectedCode", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelected", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/fdluSelectedCode", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/EMP_GP_T", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/EMP_GP_C", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/JOIN_DATE", '');
						that.AppModel.setProperty("/claimRequest/createClaimRequest/LEAVING_DATE", '');
					}
					that.hideBusyIndicator();
				}.bind(this),
				error: function (oError) {
					that.hideBusyIndicator();
				}
			});
		},

		claimItemDetails: function (claimId, EclaimSrvModel) {
			this.showBusyIndicator();
			var url = '/' + claimId + '/EclaimsItemDataDetails';
			var that = this;
			var localModel = this.getComponentModel("LookupModel");
			EclaimSrvModel.read(url, {
				filters: [new Filter("IS_DELETED", FilterOperator.EQ, 'N')],
				success: function (oData) {

					if (oData) {
						var selMonthRateTypeNamountList = that.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
						var selectedDayListAmountSet = [];
						var userRole = this.AppModel.getProperty("/userRole");
						this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwrite", "")
						this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteDesc", "")
						for (var t = 0; t < oData.results.length; t++) {
							var itemElement = oData.results[t];
							itemElement.RateTypeDetails = [];
							itemElement.selectedDayListAmountSet = [];

							//no need of start time and end time for the rate code 18, as it is monthly cw
							if (t === 0 && itemElement.RATE_TYPE === '18') {
								this.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
								this.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
							}

							//fetch WBS

							if (itemElement.WBS) {
								if (t > 0 && (itemElement.RATE_TYPE === '18' || itemElement.RATE_TYPE === '19')) {

								} else {
									//call WBS validate API 
									var oHeaders = Utility._headerToken(this);
									var wbsSetItem = {};
									var saveObj = {};
									wbsSetItem.WBS = [];
									wbsSetItem.WBS.push(itemElement.WBS);
									saveObj.WBSRequest = wbsSetItem;
									var serviceUrl = Config.dbOperations.checkWbs;
									var wbsValidateModel = new sap.ui.model.json.JSONModel();
									wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
									if (!wbsValidateModel.getData().EtOutput || !wbsValidateModel.getData().EtOutput.item || wbsValidateModel.getData().EtOutput
										.item.EvStatus === 'E') {

									} else {
										itemElement.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
										itemElement.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
										if (itemElement.RATE_TYPE === '18' || itemElement.RATE_TYPE === '19') {
											this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwrite", itemElement.WBS)
											this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteDesc", itemElement.WBS_DESC)
										}

									}
								}

							}

							//end of fetching wbs

							if (itemElement.CLAIM_START_DATE) {
								itemElement.CLAIM_START_DATE_DISPLAY = Formatter.formatDateAsString(new Date(itemElement.CLAIM_START_DATE),
									"dd Mmm, yyyy",
									false, localModel.getProperty("/monthNames"));
							}
							if (itemElement.CLAIM_END_DATE) {
								itemElement.CLAIM_END_DATE_DISPLAY = Formatter.formatDateAsString(new Date(itemElement.CLAIM_END_DATE),
									"dd Mmm, yyyy",
									false, localModel.getProperty("/monthNames"));
							}
							//handling ratetype dropdown
							if (selMonthRateTypeNamountList) {
								selMonthRateTypeNamountList.forEach(function (item, index) {
									var prevRateType;
									var prevAmount;
									var countOfAmountItems = 0;
									for (var i = 0; i < item.aAmountListitems.length; i++) {
										var rateTypeListSetItem = {};
										var amountListSetItem = {};
										var amountNotUnique = 'N';
										var startDate = Formatter.formatDateAsString(item.aAmountListitems[i].START_DATE, "yyyy-MM-dd");
										var endDate = Formatter.formatDateAsString(item.aAmountListitems[i].END_DATE, "yyyy-MM-dd");

										if (itemElement.CLAIM_START_DATE >= startDate && itemElement.CLAIM_END_DATE <= endDate) {

											//	if (i === 0) {
											if (itemElement.RATE_TYPE === item.RateTypeCode) {

												//	if (prevAmount != item.aAmountListitems[i].AMOUNT) {
												for (var m = 0; m < itemElement.selectedDayListAmountSet.length; m++) {
													if (itemElement.selectedDayListAmountSet[m].AMOUNT === item.aAmountListitems[i].AMOUNT) {
														amountNotUnique = 'Y';
														break;
													}
												}
												if (amountNotUnique === 'N') {
													amountListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
													amountListSetItem.WAGE_CODE = item.aAmountListitems[i].WAGE_CODE;
													itemElement.selectedDayListAmountSet.push(amountListSetItem);
													countOfAmountItems = countOfAmountItems + 1;
												}

											}
											rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
											rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
											//rateTypeListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
											if (prevRateType != item.RateTypeCode) {
												itemElement.RateTypeDetails.push(rateTypeListSetItem);
											}
											prevRateType = item.RateTypeCode; //itemElement.RATE_TYPE;
											prevAmount = item.aAmountListitems[i].AMOUNT;

										}
									}

									if (countOfAmountItems === 1 && userRole === 'CA' && itemElement.RATE_TYPE !== '18') {
										if (!parseInt(itemElement.RATE_TYPE_AMOUNT) > 0) {
											itemElement.RATE_TYPE_AMOUNT = prevAmount;
										}
										if (itemElement.HOURS_UNIT && itemElement.RATE_TYPE_AMOUNT) {
											if (!parseInt(itemElement.TOTAL_AMOUNT) > 0) {
												itemElement.TOTAL_AMOUNT = itemElement.HOURS_UNIT * itemElement.RATE_TYPE_AMOUNT;
												itemElement.TOTAL_AMOUNT = parseFloat(itemElement.TOTAL_AMOUNT).toFixed(2);
											}
										}
									} else if (userRole === 'ESS') {
										if (!parseInt(itemElement.RATE_TYPE_AMOUNT) > 0) {
											itemElement.RATE_TYPE_AMOUNT = '';
										}
										if (!parseInt(itemElement.TOTAL_AMOUNT) > 0) {
											itemElement.TOTAL_AMOUNT = '';
										}
									}
									countOfAmountItems = undefined;
									prevRateType = undefined;
									prevAmount = undefined;
								});
							}
							oData.results[t] = itemElement;
						}

						that.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", oData.results);
						//Begin of logic to allow deletion of the Row if there are more than one rows
						var claimRequestType = that.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
						var eclaimsItemDataDetails = that.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
						if (claimRequestType === 'Period' && !!eclaimsItemDataDetails && eclaimsItemDataDetails.length > 1) {
							that.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", true);
						} else if (claimRequestType === 'Period') {
							that.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", false);
						}
						//end of logic to allow deletion of the Row if there are more than one rows							
					}
					//begin of change by Rishi on 22 March to trigger auto save periodically after item details are fetched from DB
					var AppModel = this.AppModel.getProperty("/");
					//auto save to happen if req status is '01'and if the call is from requestor form only
					if (this.viaRequestorForm && AppModel.claimRequest.createClaimRequest.reqStatus === '01') {
						//added on 11 May to reset the auto save time interval		
						this.lastSuccessRun = new Date();
						this.runAutoSave = true;
						this._handleAutoSave();
					}
					//end of change by Rishi on 22 March to trigger auto save periodically
					this.hideBusyIndicator();
				}.bind(this),
				error: function (oError) {
					this.hideBusyIndicator();
				}.bind(this)

			});
		},

		fetchAggHoursDayTypeViewDetails: function (claimId, EclaimSrvModel) {
			this.showBusyIndicator();
			var url = '/' + claimId + '/AggHoursDayTypeViewDetails';
			var that = this;
			var localModel = this.getComponentModel("LookupModel");
			EclaimSrvModel.read(url, {
				success: function (oData) {

					if (oData) {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/AggHoursDayTypeView", oData.results);
					} else {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/AggHoursDayTypeView", []);
					}
					this.hideBusyIndicator();
				}.bind(this),
				error: function (oError) {
					this.hideBusyIndicator();
				}.bind(this)

			});
		},

		initializeModel: function (sourceReq) {
			var that = this;
			if (sourceReq === "NEW") {
				that.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", "");
				that.AppModel.setProperty("/claimRequest/createClaimRequest/moduleView", true);
				that.AppModel.setProperty("/claimRequest/createClaimRequest/weeklyView", false);
				that.AppModel.setProperty("/claimRequest/createClaimRequest/monthlyView", false);
				that.AppModel.setProperty("/claimRequest/createClaimRequest/isBankDetailsMaintained", true);
				this.AppModel.setProperty("/claimRequest/selectedDates", []);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", []);

				var month;
				var year;
				var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
				var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
				var saveSource = "initialViewLoadSave";
				this.onPressSaveDraftRequest(saveSource, sourceReq);
				//auto save to happen if req status is '01'and if the call is from requestor form only

				if (this.viaRequestorForm) {
					this.runAutoSave = true;
					this._handleAutoSave();
				}
				//end of changes
				/** Enhancement 
				 * Changed on : 22/09/2023
				 * Claim type : 102
				 * Change Desc : 1. We are already calling the rate types for 102, at the time of creating the draft request, so no need to call it mulitple times.
				 * 2. Creation of item dates for monthly and hourly.
				 * 3. Adjust the screen control behaviour for each rate types.
				 * Author : Pankaj Mishra
				 */
				var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				if (claimType !== '102') {
					this.getRateTypesAndRateAmount(month, year, ulu, fdlu, claimType);
				}
				/*else if (claimType === '102') {
					if (this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === '18') {
						this.populateClaimDatesForClaimTypeCw();
					}

				}*/
			}
		},

		getDatesWithDayTypes: function (minDate, maxDate) {
			var dateArray = [];
			var currentDate = new Date(minDate);
			var daysOfWeek = this.AppModel.getProperty("/days");
			while (Formatter.formatDateAsString(currentDate,
					"yyyy-MM-dd") <= Formatter.formatDateAsString(maxDate,
					"yyyy-MM-dd")) {
				// var dayType = currentDate.getDay() === 0 ? "Restday" : "Workday";
				var dayType = "Workday";
				var dayName = daysOfWeek[currentDate.getDay()];
				switch (dayName) {
				case 'Sunday':
					dayType = "Restday";
					break;
				case 'Saturday':
					dayType = "Offday";
					break;
				default:
					dayType = "Workday"
				}
				dateArray.push({
					date: new Date(currentDate),
					dayType: dayType,
					dayName: daysOfWeek[currentDate.getDay()]
				});
				currentDate.setDate(currentDate.getDate() + 1);
			}

			return dateArray;
		},
		populateClaimDatesForClaimTypeCw: function () {
			var localModel = this.getComponentModel("LookupModel");
			var aExistingSelectedDates = this.AppModel.getProperty("/claimRequest/selectedDates");
			var aExistingDateTblData = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails").length ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails") : [];
			var aEclaimsItemDataDates = !!this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") : [];
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var minDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
			var maxDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
			var aDates = this.getDatesWithDayTypes(new Date(minDate), new Date(maxDate));
			var aElligibleRateType = this.AppModel.getProperty("/claimRequest/createClaimRequest/RateTypeDetails");
			var oElligibleRateType = aElligibleRateType[0];
			var joiningDateOfStaff = Formatter.formatDateAsString(this.AppModel.getProperty(
				"/claimRequest/createClaimRequest/ACTUAL_JOIN_DATE_FORMAT"), "yyyy-MM-dd");
			var leavingDateOfStaff = Formatter.formatDateAsString(this.AppModel.getProperty("/claimRequest/createClaimRequest/LEAVING_DATE"),
				"yyyy-MM-dd");

			var aClaimTypeList = this.AppModel.getProperty("/claimRequest/claimTypeList");
			if (aClaimTypeList.length) {
				var elligibilityStartDate = Formatter.formatDateAsString(aClaimTypeList[0].START_DATE, "yyyy-MM-dd");
				var elligibilityEndDate = Formatter.formatDateAsString(aClaimTypeList[0].END_DATE, "yyyy-MM-dd");
				if (this.AppModel.getProperty("/userRole") === 'CA') {
					elligibilityStartDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList")[0].START_DATE;
					elligibilityEndDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList")[0].END_DATE;
				}
				if (elligibilityStartDate > joiningDateOfStaff) {
					joiningDateOfStaff = elligibilityStartDate
				}
				if (elligibilityEndDate < leavingDateOfStaff) {
					leavingDateOfStaff = elligibilityEndDate
				}
			}

			this.AppModel.setProperty("/claimRequest/createClaimRequest/rateType", oElligibleRateType.RateTypeCode);
			// "CLAIM_DAY": localModel.getProperty("/days")[oDate.getDay()],
			for (var t = 0; t < aDates.length; t++) {
				var selMonthRateTypeNamountList = this.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
				var oDate = aDates[t];
				var oClaimRowObj = {};
				oClaimRowObj.CLAIM_START_DATE_DISPLAY = Formatter.formatDateAsString(oDate.date, "dd Mmm, yyyy", false, localModel.getProperty(
					"/monthNames"));
				oClaimRowObj.CLAIM_START_DATE = Formatter.formatDateAsString(oDate.date, "yyyy-MM-dd");
				if (oClaimRowObj.CLAIM_START_DATE < joiningDateOfStaff) {
					continue;
				}
				if (oClaimRowObj.CLAIM_START_DATE > leavingDateOfStaff) {
					continue;
				}
				oClaimRowObj.CLAIM_END_DATE = Formatter.formatDateAsString(oDate.date, "yyyy-MM-dd");
				oClaimRowObj.CLAIM_DAY = oDate.dayName;
				oClaimRowObj.CLAIM_DAY_TYPE = oDate.dayType;
				oClaimRowObj.WBS = this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite");
				oClaimRowObj.WBS_DESC = this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwriteDesc");
				oClaimRowObj.START_TIME = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "18" ? "00:00" : "08:30";
				oClaimRowObj.END_TIME = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "18" ? "00:00" : "18:00"
				oClaimRowObj.RATE_TYPE = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType");
				oClaimRowObj.RATE_TYPE_AMOUNT = "";
				oClaimRowObj.TOTAL_AMOUNT = "";
				if (this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "18") {

					this.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
					this.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);

					if (oDate.dayName === 'Sunday' || oDate.dayName === 'Saturday') {
						oClaimRowObj.HOURS_UNIT = "0.00";
					} else if (oDate.dayName === 'Friday') {
						oClaimRowObj.HOURS_UNIT = "8.00";
					} else {
						oClaimRowObj.HOURS_UNIT = "8.50";
					}
				} else {
					oClaimRowObj.HOURS_UNIT = "8.50";
				}

				var boolIsPh = 0;
				var aHolidayList = this.AppModel.getProperty("/holidayList");
				for (var u = 0; u < aHolidayList.length; u++) {
					var oHoliday = aHolidayList[u];
					var sHolidayDate = Formatter.formatDateAsString(oHoliday.DATE, "yyyy-MM-dd");
					if (sHolidayDate == oClaimRowObj.CLAIM_START_DATE) {
						boolIsPh = 2;
					}
				}

				if (oClaimRowObj.CLAIM_DAY === "Sunday") {
					oClaimRowObj.CLAIM_DAY_TYPE = "Restday";
					oClaimRowObj.IS_PH = 1;
				} else if (oClaimRowObj.CLAIM_DAY === "Saturday") {
					oClaimRowObj.CLAIM_DAY_TYPE = "Offday";
					oClaimRowObj.IS_PH = 3;
				}
				if (boolIsPh === 2) {
					oClaimRowObj.IS_PH = 2;
					oClaimRowObj.HOURS_UNIT = "0.00";
					if (oClaimRowObj.CLAIM_DAY === "Sunday") { // check if public holiday is rest day or not
						oClaimRowObj.CLAIM_DAY_TYPE = "Restday";
					} else if (oClaimRowObj.CLAIM_DAY === "Saturday") {
						oClaimRowObj.CLAIM_DAY_TYPE = "Offday";
					} else {
						oClaimRowObj.CLAIM_DAY_TYPE = "Workday";
					}

				}

				oClaimRowObj.RateTypeDetails = "";
				oClaimRowObj.selectedDayListAmountSet = "";
				oClaimRowObj.WAGE_CODE = oElligibleRateType.WAGE_CODE;
				aExistingDateTblData.push(oClaimRowObj);
				aExistingSelectedDates.push({
					"startDate": oDate.date,
					"endDate": oDate.date
				});
			}
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates", aEclaimsItemDataDates);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aExistingDateTblData);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRowCount", aExistingDateTblData.length);
			this.AppModel.setProperty("/claimRequest/selectedDates", aExistingSelectedDates);
		},
		leaveDetails: function () {
			//fetch leave data
			var token = this.AppModel.getProperty("/token");
			var claimMonth = this.AppModel.getProperty("/claimRequest/createClaimRequest/actSelMonYearInNo");
			var staffNumber = this.AppModel.getProperty("/claimRequest/createClaimRequest/STF_NUMBER");
			if (!staffNumber) {
				// staffNumber = "10000027"; // temporary remove harcoding later

			} else {
				var oHeaders = {
					"Accept": "application/json",
					"Authorization": "Bearer" + " " + token
				};

				var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
					pattern: "yyyy-MM-dd"
				});
				var maxDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
				var minDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
				var maxDateFormat = oDateFormat.format(maxDate);
				var minDateFormat = oDateFormat.format(minDate);

				var params = "?startDate=" + minDateFormat + "T00:00:00" + "&endDate=" + maxDateFormat + "T12:00:00";
				var url = "/rest/leave/api/" + staffNumber + params;
				var leaveModel = new JSONModel();
				leaveModel.loadData(url, null, true, "GET", null, null, oHeaders);

				leaveModel.attachRequestCompleted(function (oResponse) {

					this.AppModel.setProperty("/claimRequest/createClaimRequest/leaveData", leaveModel.getData().d);
				}.bind(this));
			}

		},
		onPressNavigateToSelectDates: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			this.AppModel.setProperty("/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "None");
			//disabling the dates for the next dialog of planning calendar
			var aItemData = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			var aDisabledDates = [];
			var aAlreadyPushedDisabledDates = [];
			for (var t = 0; t < aItemData.length; t++) {
				var oItem = aItemData[t];
				if (aAlreadyPushedDisabledDates.indexOf(oItem.CLAIM_START_DATE) < 0) {
					aDisabledDates.push({
						"startDate": new Date(oItem.CLAIM_START_DATE),
						"endDate": new Date(oItem.CLAIM_END_DATE)
					});
					aAlreadyPushedDisabledDates.push(oItem.CLAIM_START_DATE);
				}
			}
			this.AppModel.setProperty("/claimRequest/selectedDates", aDisabledDates);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates", aDisabledDates);

			this.AppModel.setProperty("/claimRequest/createClaimRequest/wbs", "");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsDesc", "");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsElementCode", "");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/rateType", "");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/selectedStartTime", "");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/selectedEndTime", "");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", "");

			if (!this._oDateSelectPlanningCalendar) {
				this._oDateSelectPlanningCalendar = sap.ui.xmlfragment(this.createId("fragSelectPlanningCalendarDate"),
					"nus.edu.sg.claimrequest.view.fragments.detaillayout.SelectPlanningDateFromCalendar", this);
				this.getView().addDependent(this._oDateSelectPlanningCalendar);
				this._oDateSelectPlanningCalendar.setEscapeHandler(function () {
					return;
				});
				this._oDateSelectPlanningCalendar.open();
			}
		},

		onPressSelectDates: function (oEvent) {
			//Open a Dialog to show the Entire Data
			this.calendarSelectionDialog = sap.ui.xmlfragment("CalendarNTimeSelectionDialog",
				"nus.edu.sg.claimrequest.view.fragments.CalendarNTimeSelection", this);
			this.calendarSelectionDialog.addStyleClass("sapUiSizeCompact");
			this.getView().addDependent(this.calendarSelectionDialog);
			this.calendarSelectionDialog.open();
		},
		setMonthForCalendar: function () {
			var claimRequestModel = this.modelAssignment("ClaimRequest");
			var dateObj = new Date(claimRequestModel.getProperty("/month") + "-01");
			claimRequestModel.setProperty("/calendarDate", dateObj);
			this.getUIControl("dateSelectionCalendarId", "CalendarNTimeSelectionDialog").setDate(dateObj);
		},
		onChangeOfRateAmount: function (oEvent) {
			var cbBindingItemPath = oEvent.getSource().getSelectedItem().getBindingContext("AppModel").getPath();
			var oCbItemObj = this.AppModel.getProperty(cbBindingItemPath);
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var hrsOrUnit = this.AppModel.getProperty(sPath + "/HOURS_UNIT");
			var rateAmount = oCbItemObj.AMOUNT; //oEvent.getParameters().selectedItem.getKey();
			this.AppModel.setProperty(sPath + "/WAGE_CODE", oCbItemObj.WAGE_CODE ? oCbItemObj.WAGE_CODE : "");
			var totalAmount = this._fnUtilRateAmountChange(hrsOrUnit, rateAmount);
			this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);

		},
		_fnUtilRateAmountChange: function (hrsOrUnit, rateAmount) {
			if (hrsOrUnit && rateAmount) {
				var totalAmount = hrsOrUnit * rateAmount;
				return totalAmount = parseFloat(totalAmount).toFixed(2);
			} else {
				return '0.00';
			}
		},

		onChangeofhoursOrUnit: function (oEvent) {

			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var objContext = this.AppModel.getProperty(sPath);
			var rateTypeAmount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
			var startTime = this.AppModel.getProperty(sPath + "/START_TIME");
			var endTime = this.AppModel.getProperty(sPath + "/END_TIME");
			var hrsOrUnit = oEvent.getParameters().newValue;
			/**
			 * For the claim type 102, Monthly.
			 * We are allowing only, 0,4,8,>8.5
			 * As the rate type code is 18 for it, so we are going to handle via this.
			 * */

			// if (hrsOrUnit && rateTypeAmount) {
			// 	var totalAmount = hrsOrUnit * rateTypeAmount;
			// 	totalAmount = parseFloat(totalAmount).toFixed(2);
			// 	this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
			// }
			var totalAmount = this._fnUtilRateAmountChange(hrsOrUnit, rateTypeAmount);
			this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
		},

		onChangeOfRateType: function (oEvent) {
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var selectedRateType = oEvent.getParameters().selectedItem.getKey();
			var userRole = this.AppModel.getProperty("/userRole");
			// this.AppModel.setProperty(sPath + "/HOURS_UNIT", "");
			// this.AppModel.setProperty(sPath + "/START_TIME", '');
			// this.AppModel.setProperty(sPath + "/END_TIME", '');
			this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", '');
			this.AppModel.setProperty(sPath + "/RATE_TYPE_AMOUNT", '');
			var claimEndDate = this.AppModel.getProperty(sPath + "/CLAIM_END_DATE");
			var claimStartDate = this.AppModel.getProperty(sPath + "/CLAIM_START_DATE");
			claimStartDate = Formatter.formatDateAsString(claimStartDate, "yyyy-MM-dd");
			claimEndDate = Formatter.formatDateAsString(claimEndDate, "yyyy-MM-dd");

			var aAllRateTypes = this.AppModel.getProperty("/claimRequest/createClaimRequest/RateTypeDetails");
			var selectedDayListRateTypesSet = this.AppModel.getProperty(sPath + "/RateTypeDetails");
			if (selectedDayListRateTypesSet.length > 1) {
				this.AppModel.setProperty(sPath + "/selectedDayListAmountSet", []);
			}
			var itemsSet = [];
			if (aAllRateTypes) {
				for (var i = 0; i < aAllRateTypes.length; i++) {

					if (selectedRateType === aAllRateTypes[i].RateTypeCode) {

						for (var j = 0; j < aAllRateTypes[i].aAmountListitems.length; j++) {
							var startDate = Formatter.formatDateAsString(aAllRateTypes[i].aAmountListitems[j].START_DATE, "yyyy-MM-dd");
							var endDate = Formatter.formatDateAsString(aAllRateTypes[i].aAmountListitems[j].END_DATE, "yyyy-MM-dd");
							if (claimStartDate >= startDate && claimEndDate <= endDate) {
								var itemSetItem = {};
								itemSetItem.AMOUNT = aAllRateTypes[i].aAmountListitems[j].AMOUNT;
								itemSetItem.WAGE_CODE = aAllRateTypes[i].aAmountListitems[j].WAGE_CODE;
								itemsSet.push(itemSetItem);
							}
						}
					}
				}
			}
			//Sort the Array of Rate Amount Drop down values
			itemsSet.sort(
				(objA, objB) => Number(new Date(objA.AMOUNT)) - Number(new Date(objB.AMOUNT)),
			);
			//Remove the duplicates from the Array of Rate Amount Drop down values
			const aUniqueItemsSet = itemsSet.filter((value, index) => {
				const _value = JSON.stringify(value);
				return index === itemsSet.findIndex(obj => {
					return JSON.stringify(obj) === _value;
				});
			});
			this.AppModel.setProperty(sPath + "/selectedDayListAmountSet", aUniqueItemsSet);
			//to prepopulate the Rate Amount if there is only drop down value 
			if (aUniqueItemsSet.length === 1 && (userRole != 'ESS' || claimType === "102")) {
				this.AppModel.setProperty(sPath + "/RATE_TYPE_AMOUNT", aUniqueItemsSet[0].AMOUNT);
				var rateTypeAmount = aUniqueItemsSet[0].AMOUNT;
				var hrsOrUnit = this.AppModel.getProperty(sPath + "/HOURS_UNIT");
				if (this.AppModel.getProperty(sPath + "/HOURS_UNIT")) {
					var totalAmount = this._fnUtilRateAmountChange(hrsOrUnit, rateTypeAmount);
					this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
				}

			}
		},

		onChangeofDiscrepancyAmount: function (oEvent) {

		},
		onChangeofUnit: function (oEvent) {
			var unit = oEvent.getSource().getValue();
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var is_disc = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
			if (is_disc) {
				var Amount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
			} else {
				Amount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
			}

			var totalAmount = unit * Amount;
			totalAmount = parseFloat(totalAmount).toFixed(2);
			this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
		},
		onSelectOptForCompensation: function (oEvent) {
			//We are using this function for OT calculation
			var boolFlag = oEvent.getSource().getSelected();
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var objContext = this.AppModel.getProperty(sPath);
			if (boolFlag) {
				this.AppModel.setProperty(sPath + "/IS_PH", 5);
			} else {
				this.AppModel.setProperty(sPath + "/IS_PH", 4);
			}
			// var is_disc = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
			// if (is_disc) {
			// 	var Amount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
			// } else {
			// 	Amount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
			// }

			// var totalAmount = unit * Amount;
			// totalAmount = parseFloat(totalAmount).toFixed(2);
			// this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
		},
		onEnterTime: function (oEvent) {

			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var startTime = this.AppModel.getProperty(sPath + "/START_TIME");
			var endTime = this.AppModel.getProperty(sPath + "/END_TIME");
			var hours = Formatter.calculateHours(startTime, endTime);
			this.AppModel.setProperty(sPath + "/HOURS", hours);
		},
		onPressRemoveAttachment: function (oEvent) {},
		handleFileTypeMismatch: function (oEvent) {
			var uploadSet = this.getUIControl("UploadSet");
			uploadSet.removeItem();
		},

		/**
		 * Close Claim Type Dialog
		 */
		closeCalendarSelectionDialog: function () {
			if (this.calendarSelectionDialog) {
				this.calendarSelectionDialog.destroy(true);
			}
		},

		handleRemoveSelection: function () {
			this.getUIControl("dateSelectionCalendarId", "CalendarNTimeSelectionDialog").removeAllSelectedDates();
			this.modelAssignment("ClaimRequest").setProperty("/selectedClaimDates", []);
		},
		/**
		 * On Post Feed Comment
		 */
		onPostComment: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			var aRemarksData = this.AppModel.getProperty("/claimRequest/createClaimRequest/REMARKS");

			// create new entry
			var sValue = this.AppModel.getProperty("/claimRequest/HEADER_REMARKS");
			// var sValue = oEvent.getParameter("value");
			sValue = sValue.trim().replaceAll(">", "&gt;").replaceAll("<", "&lt;");
			//sValue = sValue.trim();
			var sDate = Formatter.formatDateAsString(new Date(), "yyyy-MM-dd hh:MM:ss");
			var displayDate = Formatter.formatDateAsString(sDate, "dd/MM/yyyy hh:MM:ss");
			var oEntry = {
				"ID": "",
				"NUSNET_ID": this.AppModel.getProperty("/loggedInUserId"),
				"STAFF_ID": this.AppModel.getProperty("/loggedInUserStfNumber"),
				"STAFF_NAME": this.AppModel.getProperty("/staffInfo/FULL_NM"),
				"REMARKS": sValue,
				"REMARKS_UPDATE_ON": sDate,
				"commentDisplayDate": displayDate,
				"STAFF_USER_TYPE": this.AppModel.getProperty("/userRole")
			};

			aRemarksData = (aRemarksData instanceof Array) ? aRemarksData : [];
			aRemarksData.unshift(oEntry);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/REMARKS", aRemarksData);
		},

		validation: function () {
			this.validateDatesOverlap();
		},

		validateDatesOverlap: function () {

			var itemsSet = [];
			var userRole = this.AppModel.getProperty("/userRole");
			var claimItems = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			//var claimItemsCopy = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			claimItems = Utility._fnSortingEclaimItemData(claimItems);;
			// this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", sortedAsc);
			// this.AppModel.refresh(true);

			if (claimItems) {
				var newLineItem = 0;
				var dateOverlapErrorFlag;

				for (var i = 0; i < claimItems.length; i++) {
					var item = claimItems[i];

					//check start Time is filled or not if Rate type is Hourly
					if (item.RATE_TYPE === '10') {
						if (!item.START_TIME) {
							item.valueStateStartTime = "Error";
							item.valueStateTextStartTime = "Mandatory field";
						} else {
							item.valueStateStartTime = "None";
							item.valueStateTextStartTime = "";
						}

						//check End Time is filled or not if Rate type is Hourly
						if (!item.END_TIME) {
							item.valueStateEndTime = "Error";
							item.valueStateTextEndTime = "Mandatory field";
						} else {
							item.valueStateEndTime = "None";
							item.valueStateTextEndTime = "";
						}
					}

					//check Hours or Unit is filled or not
					if (!item.HOURS_UNIT) {
						item.valueStateHoursOrUnit = "Error";
						item.valueStateTextHoursOrUnit = "Mandatory field";
					} else {
						item.valueStateHoursOrUnit = "None";
						item.valueStateTextHoursOrUnit = "";
					}

					//check Rate type is filled or not
					if (!item.RATE_TYPE) {
						item.valueStateRateType = "Error";
						item.valueStateTextRateType = "Mandatory field";
					} else {
						item.valueStateRateType = "None";
						item.valueStateText = "";
					}

					//check Discrepancy amount and Remarks are filled or not if Disc
					if (item.IS_DISCREPENCY) {
						if (!item.DISC_RATETYPE_AMOUNT) {
							item.valueStateDiscAmount = "Error";
							item.valueStateTextDiscAmount = "Mandatory field";
						} else {
							item.valueStateDiscAmount = "None";
							item.valueStateTextDiscAmount = "";
						}
						if (!item.REMARKS) {
							// item.valueStateRemarks = "Error";
							// item.valueStateTextRemarks = "Mandatory field";
							//capture the message as Remarks is mandatory if IS_DISC flag is set.

						} else {
							// item.valueStateRemarks = "None";
							// item.valueStateTextRemarks = "";								
						}

					} else {
						if (!item.RATE_TYPE_AMOUNT && item.RATE_TYPE) {
							// item.valueStateRateType = "None";
							// item.valueStateText = "";
							//capture the message "No Rate Amount maintained"
						}

					}

					//check WBS filled is valid or not
					if (item.WBS) {
						//call WBS validate API 
						var token = this.AppModel.getProperty("/token");
						//	var wbs = item.WBS;
						//	if (wbs) {
						var wbsSet = [];
						var wbsSetItem = {};
						var saveObj = {};
						wbsSetItem.WBS = item.WBS;
						wbsSet.push(wbsSetItem);
						saveObj.WBSRequest = wbsSet;
						var oHeaders = {
							"Accept": "application/json",
							"Authorization": "Bearer" + " " + token,
							"AccessPoint": "A",
							"Content-Type": "application/json"
						};
						var url = "/rest/eclaims/ecpwbsvalidate";
						var wbsValidateModel = new JSONModel();
						wbsValidateModel.loadData(url, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
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
							item.valueStateText = wbsValidateModel.getData().EtOutput.item.EvMsg;
							// this.AppModel.setProperty("/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "Error");
							// this.AppModel.setProperty("/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs", wbsValidateModel.getData().EtOutput
							// 	.item.EvMsg);
						} else {
							item.valueStateWbs = "None";
							item.valueStateText = "";
							item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
							item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
						}
					}

					if (i > 0) {
						var prevStartDate = claimItems[i - 1].CLAIM_START_DATE;
						var prevEndDate = claimItems[i - 1].CLAIM_END_DATE;
						var prevRateType = claimItems[i - 1].RATE_TYPE;

						if ((item.CLAIM_START_DATE >= prevStartDate && item.CLAIM_START_DATE <= prevEndDate) || (item.CLAIM_END_DATE >= prevStartDate &&
								item.CLAIM_END_DATE <= prevEndDate)) {

							if (prevRateType === item.RATE_TYPE) //need to ensure hourly and monthly can also not go together
							{
								//dateOverlapErrorFlag = 'X';
								this.AppModel.setProperty("/claimRequest/createClaimRequest/dateOverlapErrorFlag", 'X');
								MessageBox.error("Save failed due to date overlap");
								break;
							}
						}

					} //this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", claimItemsCopy);
				}
			}
			//	this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", sortedAsc);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", claimItems);
			this.AppModel.refresh(true);
		},

		// onChangeofWbs: function (oEvent) {
		// 	
		// 	//check WBS filled is valid or not
		// 	var wbsEntered = oEvent.getParameters("value");
		// 	if (wbsEntered) {
		// 		//call WBS validate API 
		// 		var token = this.AppModel.getProperty("/token");
		// 		//	var wbs = item.WBS;
		// 		//	if (wbs) {
		// 		var wbsSet = [];
		// 		var wbsSetItem = {};
		// 		var saveObj = {};
		// 		wbsSetItem.WBS = wbsEntered;
		// 		wbsSet.push(wbsSetItem);
		// 		saveObj.WBSRequest = wbsSet;
		// 		var oHeaders = {
		// 			"Accept": "application/json",
		// 			"Authorization": "Bearer" + " " + token,
		// 			"Content-Type": "application/json"
		// 		};
		// 		var url = "/rest/eclaims/ecpwbsvalidate";
		// 		var wbsValidateModel = new JSONModel();
		// 		wbsValidateModel.loadData(url, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
		// 		if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
		// 			item.valueStateWbs = "Error";
		// 			item.valueStateText = wbsValidateModel.getData().EtOutput.item.EvMsg;
		// 			// this.AppModel.setProperty("/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "Error");
		// 			// this.AppModel.setProperty("/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs", wbsValidateModel.getData().EtOutput
		// 			// 	.item.EvMsg);
		// 		} else {
		// 			item.valueStateWbs = "None";
		// 			item.valueStateText = "";
		// 			item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
		// 			item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
		// 		}
		// 	}

		// }},

		onPressSaveDraftRequest: function (saveSource, sourceReq, unlockSent) {
			this.showBusyIndicator(0);
			var url = "/rest/eclaims/singleRequest";
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var oReturnValidation = validation._fnSaveValidation(this);
			if (oReturnValidation.hasValidationError) {
				MessageBox.error("Validation failed. Please check Error List for details.");
				this.hideBusyIndicator();
				return;
			}
			var saveOrSubmit = 'Save';
			var aSaveObj = this.getSaveObject(saveOrSubmit);

			//testing payload

			// aSaveObj = [{
			// 	"CLAIM_TYPE": "101",
			// 	"STAFF_ID": "151361",
			// 	"CLAIM_REQUEST_TYPE": "Daily",
			// 	"CLAIM_MONTH": "04-2024",
			// 	"TOTAL_AMOUNT": " ",
			// 	"WBS": " ",
			// 	"ULU": "0261046100",
			// 	"FDLU": "0004630003",
			// 	"DRAFT_ID": "DT2406000028",
			// 	"VERIFIER": [{
			// 		"PPNT_ID": "",
			// 		"STAFF_ID": "81609",
			// 		"NUSNET_ID": "PTT_VF1",
			// 		"ULU": "0261046100",
			// 		"FDLU": "0004630003",
			// 		"STAFF_FULL_NAME": "Afton Keyan Keyan"
			// 	}],
			// 	"ADDTIONAL_APPROVER_1": [{
			// 		"PPNT_ID": "",
			// 		"STAFF_ID": "",
			// 		"NUSNET_ID": "",
			// 		"ULU": "",
			// 		"FDLU": "",
			// 		"STAFF_FULL_NAME": ""
			// 	}],
			// 	"ADDTIONAL_APPROVER_2": [{
			// 		"PPNT_ID": "",
			// 		"STAFF_ID": "",
			// 		"NUSNET_ID": "",
			// 		"ULU": "",
			// 		"FDLU": "",
			// 		"STAFF_FULL_NAME": ""
			// 	}],
			// 	"ATTACHMENTS": [],
			// 	"REMARKS": [{
			// 		"ID": "",
			// 		"NUSNET_ID": "PTT_CA1",
			// 		"STAFF_ID": "81535",
			// 		"STAFF_NAME": "Diane Nathan",
			// 		"REMARKS": "Demo of Reset Status",
			// 		"REMARKS_UPDATE_ON": "2024-06-05 11:47:21",
			// 		"commentDisplayDate": "05/06/2024 11:47:21",
			// 		"STAFF_USER_TYPE": "CA"
			// 	}],
			// 	"REQUEST_STATUS": "01",
			// 	"isMassUpload": "N",
			// 	"isSave": "N",
			// 	"ACTION": "SAVE",
			// 	"ROLE": "CA",
			// 	"REQUEST_ID": "",
			// 	"selectedClaimDates": [{
			// 		"ITEM_ID": "",
			// 		"CLAIM_START_DATE": "2024-04-01",
			// 		"CLAIM_END_DATE": "2024-04-01",
			// 		"START_TIME": "11:00",
			// 		"END_TIME": "19:00",
			// 		"CLAIM_START_DATE_DISPLAY": "01 Apr, 2024",
			// 		"CLAIM_DAY": "Monday",
			// 		"HOURS_UNIT": "7.00",
			// 		"RATE_TYPE": "10",
			// 		"CLAIM_REQUEST_TYPE_NUMBER": "10",
			// 		"CLAIM_DAY_TYPE": "Workday",
			// 		"WBS": "",
			// 		"WAGE_CODE": "",
			// 		"REMARKS": "",
			// 		"TOTAL_AMOUNT": "2800.00",
			// 		"IS_DISCREPENCY": 0,
			// 		"RATE_TYPE_AMOUNT": "400.00",
			// 		"DISC_RATETYPE_AMOUNT": ""
			// 	}, {
			// 		"ITEM_ID": "",
			// 		"CLAIM_START_DATE": "2024-04-02",
			// 		"CLAIM_END_DATE": "2024-04-02",
			// 		"START_TIME": "11:00",
			// 		"END_TIME": "19:00",
			// 		"CLAIM_START_DATE_DISPLAY": "02 Apr, 2024",
			// 		"CLAIM_DAY": "Tuesday",
			// 		"HOURS_UNIT": "7.00",
			// 		"RATE_TYPE": "10",
			// 		"CLAIM_REQUEST_TYPE_NUMBER": "10",
			// 		"CLAIM_DAY_TYPE": "Workday",
			// 		"WBS": "",
			// 		"WAGE_CODE": "",
			// 		"REMARKS": "",
			// 		"TOTAL_AMOUNT": "2800.00",
			// 		"IS_DISCREPENCY": 0,
			// 		"RATE_TYPE_AMOUNT": "400.00",
			// 		"DISC_RATETYPE_AMOUNT": ""
			// 	}, {
			// 		"ITEM_ID": "",
			// 		"CLAIM_START_DATE": "2024-04-03",
			// 		"CLAIM_END_DATE": "2024-04-03",
			// 		"START_TIME": "11:00",
			// 		"END_TIME": "19:00",
			// 		"CLAIM_START_DATE_DISPLAY": "03 Apr, 2024",
			// 		"CLAIM_DAY": "Wednesday",
			// 		"HOURS_UNIT": "7.00",
			// 		"RATE_TYPE": "10",
			// 		"CLAIM_REQUEST_TYPE_NUMBER": "10",
			// 		"CLAIM_DAY_TYPE": "Workday",
			// 		"WBS": "",
			// 		"WAGE_CODE": "",
			// 		"REMARKS": "",
			// 		"TOTAL_AMOUNT": "2800.00",
			// 		"IS_DISCREPENCY": 0,
			// 		"RATE_TYPE_AMOUNT": "400.00",
			// 		"DISC_RATETYPE_AMOUNT": ""
			// 	}]
			// }]

			//end of testing payload

			//	this.validation();
			//	this.validateDatesOverlap();
			//	this.validateWbs();
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var saveClaimModel = new JSONModel();
			saveClaimModel.loadData(url, JSON.stringify(aSaveObj), true, "POST", null, null, oHeaders);
			saveClaimModel.attachRequestCompleted(function (oResponse) {

				if (oResponse.getParameter("errorobject") && !oResponse.getParameter("success")) {
					var oRetErrorResponse = JSON.parse(oResponse.getParameter("errorobject").responseText);
					3
					this.hideBusyIndicator();
					if (!oRetErrorResponse.ignoreError) {
						MessageBox.error(JSON.parse(oResponse.getParameter("errorobject").responseText).message);
					}

				} else if (oResponse.getSource().getData().claimDataResponse.eclaimsData[0].ERROR_STATE) // === 'true') 
				{
					this.hideBusyIndicator();
					//
					//fill the message pop over data in case of error state being true
					//
				} else {
					if (unlockSent === true) {
						this.onClose();
					}
					var draftId = !oResponse.getSource().getData().claimDataResponse.eclaimsData[0].DRAFT_ID ? "" : oResponse.getSource().getData()
						.claimDataResponse.eclaimsData[
							0].DRAFT_ID;
					this.AppModel.setProperty("/claimRequest/createClaimRequest/draftId", draftId);

					//added by pankaj on 17/02/2023 to handle the tab close and browser close
					sap.ui.getCore().AppContext.SelectedDraftID = draftId;

					var reqStatus = !oResponse.getSource().getData().claimDataResponse.eclaimsData[0].REQUEST_STATUS ? "" : oResponse.getSource().getData()
						.claimDataResponse
						.eclaimsData[0].REQUEST_STATUS;
					if (reqStatus === "01") {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", "Save As Draft");
						this.AppModel.setProperty("/claimRequest/createClaimRequest/reqStatus", reqStatus);
						this.lastSuccessRun = new Date();
					}
					//added 3rd condition onAutoSave by Rishi on 21 March
					if (saveSource !== "initialViewLoadSave" && saveSource !== "onCloseSaveCall" && saveSource !== "onAutoSave") {
						MessageToast.show("Draft saved");
						var sDraftId = "EclaimRequestViews('" + draftId + "')";
						this.claimItemDetails(sDraftId, EclaimSrvModel);
						this.fetchAggHoursDayTypeViewDetails(sDraftId, EclaimSrvModel);
						// this.remarksDataRefresh(EclaimSrvModel, draftId);
						this._fnRefreshDataAfterSave(sDraftId, EclaimSrvModel);
					} else {
						this.setVisibility(sourceReq);
					}
				}

			}, this);
		},
		_fnRefreshDataAfterSave: function (sDraftId, EclaimSrvModel) {
			EclaimSrvModel.read("/" + sDraftId, {
				urlParameters: {
					"$expand": "RemarksDataDetails"
				},
				success: function (oData) {
					var requestData = oData;
					var remarkItems = requestData.RemarksDataDetails.results;
					this.AppModel.setProperty("/claimRequest/createClaimRequest/REMARKS", requestData.RemarksDataDetails.results);

					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME", requestData.VERIFIER_STAFF_FULL_NAME);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID", requestData.VERIFIER_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_STAFF_ID", requestData.VERIFIER_STAFF_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER_PPNT_ID", requestData.VERIFIER_PPNT_ID);

					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME", requestData.ADDITIONAL_APP_2_STAFF_FULL_NAME);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID", requestData.ADDITIONAL_APP_2_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID", requestData.ADDITIONAL_APP_2_STAFF_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_PPNT_ID", requestData.ADDITIONAL_APP_2_PPNT_ID);

					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME", requestData.ADD_APP_1_STAFF_FULL_NAME);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID", requestData.ADD_APP_1_NUSNET_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID", requestData.ADD_APP_1_STAFF_ID);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_PPNT_ID", requestData.ADD_APP_1_PPNT_ID);

				}.bind(this),
				error: function (oError) {}
			});
		},
		onPressSubmit: function () {
			this.showBusyIndicator();
			// //to stop auto save as soon as user clicks on Submit button
			// if (this.autoSaveTrigger) {
			// 	this.autoSaveTrigger.setInterval(0);
			// }
			var saveOrSubmit = 'Submit';
			//this.aSaveObj = this.getSaveObject(saveOrSubmit);
			var oReturnValidation = validation._fnSubmitValidation(this);
			if (oReturnValidation.hasValidationError) {
				MessageBox.error("Validation failed. Please check Error List for details.");
				this.hideBusyIndicator();
				return;
			} else {
				if (this.AppModel.getProperty("/userRole") === 'ESS') {
					//proceed for the submission
					Utility._fnAppModelSetProperty(this, "/disclaimerConfirmChecked", false);
					var fragmentName = "nus.edu.sg.claimrequest.view.fragments.display.AcknowledgementDialog";
					var fragId = this.getView().getId();
					this.hideBusyIndicator();
					Utility._handleOpenFragment(this, fragmentName, fragId, null);
				} else {
					this.onSubmitBackendCall();
				}
			}
			//this.aSaveObj = this.getSaveObject(saveOrSubmit);
		},
		onAcknowledgedSubmit: function () {
			this.showBusyIndicator(); //added to avoid multiple clicking of Submit button in confirmation pop-up
			this.onSubmitBackendCall();
		},

		onSubmitBackendCall: function () {
			//16 April testing
			this.runAutoSave = false;
			if (this.autoSaveTrigger) {
				this.autoSaveTrigger.setInterval(0);
			}
			// ,Xgq;8N]
			var saveOrSubmit = 'Submit';
			this.aSaveObj = this.getSaveObject(saveOrSubmit);
			// console.log(JSON.stringify(this.aSaveObj));
			// return;
			Utility._fnSubmitClaim(this, function (oData) {
				if (!oData.getParameter("success")) {
					this.runAutoSave = true;
					this.lastSuccessRun = new Date();
					// if (this.autoSaveTrigger) {
					// 	this.autoSaveTrigger.setInterval(300000);
					// }
					MessageBox.error(JSON.parse(oData.getParameter("errorobject").responseText).message);
				} else if (oData.getParameter("success")) // === 'true')
				{

					var oResponse = oData.getSource().getProperty("/");

					if (oResponse.error) {
						this.runAutoSave = true;
						this.lastSuccessRun = new Date();
						// if (this.autoSaveTrigger) {
						// 	this.autoSaveTrigger.setInterval(300000);
						// }
						if (oResponse.claimDataResponse.eclaimsData[0].ERROR_STATE) {
							this.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", oResponse.claimDataResponse.eclaimsData[
								0].validationResults);
							MessageBox.error(oResponse.message);
						}
					} else {
						var requestId = !oResponse.claimDataResponse.eclaimsData[0].REQUEST_ID ? "" :
							oResponse.claimDataResponse.eclaimsData[0].REQUEST_ID;

						if (requestId) {
							//set autosave flag to false if request ID is generated after submission
							this.runAutoSave = false;
							this.AppModel.setProperty("/claimRequest/createClaimRequest/requestId", requestId);
							var reqStatus = oResponse.claimDataResponse.eclaimsData[0].REQUEST_STATUS;
							if (reqStatus === '02') {
								this.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", "Pending for Check");
								//	this.AppModel.setProperty("/showWithdrawButton", true);
								this.AppModel.setProperty("/showSaveButton", false);
								this.AppModel.setProperty("/showSubmitButton", false);
							}
							this.aSaveObj = [];
							this._fnRequestLockHandling();
							sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
							Utility._fnSuccessDialog(this, "Claim Request ID".concat(" ", requestId, " submitted."), function () {
								this.oRouter.navTo("master", {
									layout: "OneColumn"
								}, true);
								// if (this.autoSaveTrigger) {
								// 	this.autoSaveTrigger.setInterval(0);
								// }
							}.bind(this));

						}
					}

				}
				if (this.AppModel.getProperty("/userRole") === 'ESS') {
					Utility._handleCloseOpenedFragment(this);
				}
				this.hideBusyIndicator();
			}.bind(this));
		},

		onAcknowledgedCancel: function () {
			this.aSaveObj = [];
			Utility._handleCloseOpenedFragment(this);
			this.hideBusyIndicator();
		},
		onPressCheck: function () {
			this.showBusyIndicator();
			var url = "/rest/eclaims/singleRequest";
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var saveOrSubmit = 'Check';
			//
			var oReturnValidation = validation._fnSubmitValidation(this);
			if (oReturnValidation.hasValidationError) {
				MessageBox.error("Validation failed. Please check Error List for details.");
				this.hideBusyIndicator();
				return;
			} else {
				//
				var aSaveObj = this.getSaveObject(saveOrSubmit);
				// console.log(aSaveObj);
				// return;
				var saveClaimModel = new JSONModel();
				saveClaimModel.loadData(url, JSON.stringify(aSaveObj), false, "POST", null, null, oHeaders);
				//		saveClaimModel.attachRequestCompleted(function (oResponse) {
				if (saveClaimModel.oData.error) {
					MessageBox.error(saveClaimModel.oData.message);
				} else if (saveClaimModel.oData.claimDataResponse.eclaimsData[0].ERROR_STATE) // === 'true')
				{

					//fill the message pop over data in case of error state being true
					//
				} else {
					this.runAutoSave = false; //stop auto save
					this.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", "Pending Verification");
					this.AppModel.setProperty("/showSaveButton", false);
					this.AppModel.setProperty("/showCheckButton", false);
					this.AppModel.setProperty("/showRejectButton", false);
					MessageBox.success(saveClaimModel.oData.message);
					this._fnRequestLockHandling();
					this.hideBusyIndicator();
					sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
					this.oRouter.navTo("master", {
						layout: "OneColumn"
					}, true);

					// if (this.autoSaveTrigger) {
					// 	this.autoSaveTrigger.setInterval(0);
					// }
				}
			}
		},

		onPressVerify: function () {
			var url = "/rest/eclaims/singleRequest";
			var that = this;
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var saveOrSubmit = 'Verify';
			var aSaveObj = this.getSaveObject(saveOrSubmit);
			// console.log(JSON.stringify(aSaveObj));
			// return;
			var saveClaimModel = new JSONModel();
			saveClaimModel.loadData(url, JSON.stringify(aSaveObj), false, "POST", null, null, oHeaders);
			if (saveClaimModel.getData().error) {
				//	MessageToast.show(saveClaimModel.getData().message);
				MessageBox.error(saveClaimModel.oData.message);
			} else if (saveClaimModel.oData.claimDataResponse.eclaimsData[0].ERROR_STATE) // === 'true')
			{
				//fill the message pop over data in case of error state being true
				//
			} else {
				this.runAutoSave = false; //stop auto save
				this._fnRequestLockHandling();
				sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
				Utility._fnCrossAppNavigationToInbox();
				// if (this.autoSaveTrigger) {
				// 	this.autoSaveTrigger.setInterval(0);
				// }
			}
		},

		onPressApprove: function () {
			var url = "/rest/eclaims/singleRequest";
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var saveOrSubmit = 'Approve';
			var aSaveObj = this.getSaveObject(saveOrSubmit);

			// console.log(aSaveObj);
			// return;
			var saveClaimModel = new JSONModel();
			saveClaimModel.loadData(url, JSON.stringify(aSaveObj), false, "POST", null, null, oHeaders);
			if (saveClaimModel.getData().error) {
				//	MessageToast.show(saveClaimModel.getData().message);
				MessageBox.error(saveClaimModel.oData.message);
			} else if (saveClaimModel.oData.claimDataResponse.eclaimsData[0].ERROR_STATE) // === 'true')
			{

				//fill the message pop over data in case of error state being true
				//
			} else {
				//	MessageToast.show(saveClaimModel.oData.claimDataResponse.message);
				/*	MessageBox.success(saveClaimModel.oData.message);
					this.oRouter.navTo("master", {
						layout: "OneColumn"
					});*/
				this.runAutoSave = false; //stop auto save
				this._fnRequestLockHandling();
				sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
				Utility._fnCrossAppNavigationToInbox();
				// if (this.autoSaveTrigger) {
				// 	this.autoSaveTrigger.setInterval(0);
				// }
			}
		},

		onPressReject: function () {
			if (!this._oRejectClaimDlg) {
				this._oRejectClaimDlg = sap.ui.xmlfragment(
					this.getView().getId(),
					"nus.edu.sg.claimrequest.view.fragments.detaillayout.RejectRemarks",
					this
				);
				this.getView().addDependent(this._oRejectClaimDlg);
			}
			this.AppModel.setProperty("/rejectionRemarksState", "None");
			this.AppModel.setProperty("/rejectionRemarksError", "");
			this._oRejectClaimDlg.open();
		},
		onCancelRejectReason: function () {
			var sRejectRemarks = Utility._fnAppModelSetProperty(this, "/rejectionRemarks", "");
			this._oRejectClaimDlg.close();
			this._oRejectClaimDlg.destroy();
			this._oRejectClaimDlg = null;
			this._oRejectClaimDlg = undefined;
		},
		onSubmitRejectReason: function () {
			this.showBusyIndicator();
			var serviceUrl = Config.dbOperations.postClaim;
			var oHeaders = Utility._headerToken(this);
			var userRole = this.AppModel.getProperty("/userRole");
			var sRejectRemarks = Utility._fnAppModelGetProperty(this, "/rejectionRemarks");
			if (sRejectRemarks.trim().length > 0) {
				var saveOrSubmit = 'Reject';
				var aSaveObj = this.getSaveObject(saveOrSubmit);

				var saveClaimModel = new JSONModel();

				var aRemarksData = aSaveObj[0].REMARKS;
				// create new entry
				var sValue = sRejectRemarks.trim();
				var sDate = Formatter.formatDateAsString(new Date(), "yyyy-MM-dd hh:MM:ss");
				var displayDate = Formatter.formatDateAsString(sDate, "dd/MM/yyyy hh:MM:ss");
				var oEntry = {
					"ID": "",
					"NUSNET_ID": this.AppModel.getProperty("/loggedInUserId"),
					"STAFF_ID": this.AppModel.getProperty("/loggedInUserStfNumber"),
					"STAFF_NAME": this.AppModel.getProperty("/staffInfo/FULL_NM"),
					"REMARKS": sValue,
					"REMARKS_UPDATE_ON": sDate,
					"commentDisplayDate": displayDate,
					"STAFF_USER_TYPE": this.AppModel.getProperty("/userRole")
				};

				aRemarksData = (aRemarksData instanceof Array) ? aRemarksData : [];
				aRemarksData.unshift(oEntry);

				aSaveObj[0].REMARKS = aRemarksData;
				this.aSaveObj = aSaveObj;
				Utility._fnSubmitClaim(this, function (oData) {
					if (!oData.getParameter("success")) {
						MessageBox.error(JSON.parse(oData.getParameter("errorobject").responseText).message);
					} else if (oData.getParameter("success")) // === 'true')
					{
						var oResponse = oData.getSource().getProperty("/");

						if (!oResponse.error) {
							if (oResponse.claimDataResponse.eclaimsData[0].ERROR_STATE) {
								this.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", oResponse.claimDataResponse.eclaimsData[
									0].validationResults);
								if (oResponse.message) {
									MessageBox.error(oResponse.message);
								} else {
									MessageBox.error("Please check the error log..!");

								}

							} else {
								this.runAutoSave = false; //stop auto save
								this.AppModel.setProperty("/claimRequest/createClaimRequest/REMARKS", aRemarksData);
								//Changed the message
								//MessageBox.success(saveClaimModel.oData.message);
								MessageBox.success(oResponse.message);
								this._fnRequestLockHandling();
								sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
								if (userRole === "ESS" || userRole === "CA") {
									this.oRouter.navTo("master", {
										layout: "OneColumn"
									}, true);
									// if (this.autoSaveTrigger) {
									// 	this.autoSaveTrigger.setInterval(0);
									// }
								} else {
									Utility._fnCrossAppNavigationToInbox();
									// if (this.autoSaveTrigger) {
									// 	this.autoSaveTrigger.setInterval(0);
									// }
								}
							}
							this.onCancelRejectReason();
						}
					}
					this.hideBusyIndicator();
				}.bind(this));

			} else {
				// MessageBox.error(this.getI18n("RejectionRemarksRequired"));

				this.AppModel.setProperty("/rejectionRemarksState", "Error");
				this.AppModel.setProperty("/rejectionRemarksError", this.getI18n("RejectionRemarksRequired"));

				this.hideBusyIndicator();
				return;
			}

		},

		onPressWithdraw: function () {

			var url = "/rest/eclaims/singleRequest";
			var that = this;
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var saveOrSubmit = 'Withdraw';
			var aSaveObj = this.getSaveObject(saveOrSubmit);

			var saveClaimModel = new JSONModel();
			saveClaimModel.loadData(url, JSON.stringify(aSaveObj), false, "POST", null, null, oHeaders);
			if (saveClaimModel.getData().error) {
				MessageToast.show(saveClaimModel.getData().message);
			} else {
				MessageToast.show(saveClaimModel.getData().claimDataResponse.message);
				var reqStatus = saveClaimModel.getData().claimDataResponse.eclaimsData[0].REQUEST_STATUS;
				if (reqStatus === '12') {
					this.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", "Withdrawn by Claim Assistant");
				} else {
					if (reqStatus === '10') {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/statusDisplay", "Withdrawn by Claimant");
					}
				}
				this.AppModel.setProperty("/showSaveButton", false);
				this.AppModel.setProperty("/showApproveButton", false);
				this.AppModel.setProperty("/showRejectButton", false);
				this.AppModel.setProperty("/showCheckButton", false);
				this.AppModel.setProperty("/showSubmitButton", false);
				this.AppModel.setProperty("/showWithdrawButton", false);
				window.history.go(-1);
			}
		},
		confirmPopUpToRetract: function () {
			var that = this;
			//this.AppModel.setProperty("/onCloseViewIsSave", '');
			MessageBox.confirm("Do you want to Retract the Claim?", {
				title: "Confirmation",
				actions: [sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.NO
				],
				emphasizedAction: sap.m.MessageBox.Action.OK,
				onClose: function (oAction) {
					if (oAction === "YES") {
						//make a backend call to Retract the Claim
						that.retractClaim();
					} else {
						//do nothing
					}
				}.bind(this)
			});
		},

		onPressRetract: function () {
			this.confirmPopUpToRetract();
		},

		retractClaim: function () {
			this.showBusyIndicator();
			var url = "/rest/eclaims/singleRequest";
			var that = this;
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var saveOrSubmit = 'Retract';
			var aSaveObj = this.getSaveObject(saveOrSubmit);

			var saveClaimModel = new JSONModel();
			saveClaimModel.loadData(url, JSON.stringify(aSaveObj), true, "POST", null, null, oHeaders);
			saveClaimModel.attachRequestCompleted(function (oResponse) {
				if (oResponse.getParameter("errorobject") && !oResponse.getParameter("success")) {
					MessageBox.error(JSON.parse(oResponse.getParameter("errorobject").responseText).message);
					this.hideBusyIndicator();
				} else {
					this.runAutoSave = false; //stop auto save
					this._fnRequestLockHandling();
					sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
					this.hideBusyIndicator();
					this.oRouter.navTo("master", {
						layout: "OneColumn"
					}, true);
				}
			}, this);
		},

		getSaveObject: function (saveOrSubmit) {

			var AppModel = this.AppModel.getProperty("/");

			var claimRequestType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
			var saveObj = {};
			saveObj.CLAIM_TYPE = AppModel.claimRequest.createClaimRequest.claimType;
			//saveObj.CLAIM_TYPE = AppModel.claimRequest.createClaimRequest.claimTypeList[0].CLAIM_TYPE_C;
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === "ESS") {
				//	saveObj.STAFF_NUSNET_ID = this.AppModel.getProperty("/loggedInUserId");
				saveObj.STAFF_ID = this.AppModel.getProperty("/loggedInUserStfNumber");
			}
			if (userRole === "CA") {
				//saveObj.STAFF_NUSNET_ID = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
				//saveObj.STAFF_NUSNET_ID = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimantNusNetId");
				saveObj.STAFF_ID = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimantStaffId");
			}

			if (claimRequestType === 'Period') {
				saveObj.CLAIM_REQUEST_TYPE = 'Period';
			}
			if (claimRequestType === 'Daily' || userRole === "ESS") {
				saveObj.CLAIM_REQUEST_TYPE = 'Daily';
			}
			//saveObj.STAFF_NUSNET_ID = AppModel.loggedInUserId;
			saveObj.CLAIM_MONTH = AppModel.claimRequest.createClaimRequest.actSelMonYearInNo;
			saveObj.TOTAL_AMOUNT = " "; ///to moved to item level later
			saveObj.WBS = " ";
			//saveObj.ULU = AppModel.claimRequest.createClaimRequest.ULU_C;
			saveObj.ULU = AppModel.claimRequest.createClaimRequest.uluSelectedCode;
			saveObj.FDLU = AppModel.claimRequest.createClaimRequest.fdluSelectedCode;
			saveObj.DRAFT_ID = AppModel.claimRequest.createClaimRequest.draftId ? AppModel.claimRequest.createClaimRequest.draftId : "";
			var verifiersSet = [];
			var verifierSetItem = {};

			var addApproversSet1 = [];
			var addApproversSet2 = [];
			var addApproverSetItem1 = {};
			var addApproverSetItem2 = {};

			if (AppModel.userRole === 'CA' || AppModel.userRole === 'APPROVER' || AppModel.userRole === 'VERIFIER') {
				verifierSetItem.PPNT_ID = !AppModel.claimRequest.createClaimRequest.VERIFIER_PPNT_ID ? "" : AppModel.claimRequest.createClaimRequest
					.VERIFIER_PPNT_ID;
				verifierSetItem.STAFF_ID = !AppModel.claimRequest.createClaimRequest.VERIFIER_STAFF_ID ? "" : AppModel.claimRequest.createClaimRequest
					.VERIFIER_STAFF_ID;
				verifierSetItem.NUSNET_ID = !AppModel.claimRequest.createClaimRequest.VERIFIER_NUSNET_ID ? "" : AppModel.claimRequest.createClaimRequest
					.VERIFIER_NUSNET_ID;
				verifierSetItem.ULU = !AppModel.claimRequest.createClaimRequest.VERIFIER_ULU ? "" : AppModel.claimRequest.createClaimRequest.VERIFIER_ULU;
				verifierSetItem.FDLU = !AppModel.claimRequest.createClaimRequest.VERIFIER_FDLU ? "" : AppModel.claimRequest.createClaimRequest.VERIFIER_FDLU;
				verifierSetItem.STAFF_FULL_NAME = !AppModel.claimRequest.createClaimRequest.VERIFIER_STAFF_FULL_NAME ? "" : AppModel.claimRequest
					.createClaimRequest
					.VERIFIER_STAFF_FULL_NAME;

				addApproverSetItem1.PPNT_ID = !AppModel.claimRequest.createClaimRequest.ADD_APP_1_PPNT_ID ? "" : AppModel.claimRequest.createClaimRequest
					.ADD_APP_1_PPNT_ID;
				addApproverSetItem1.STAFF_ID = !AppModel.claimRequest.createClaimRequest.ADD_APP_1_STAFF_ID ? "" : AppModel.claimRequest.createClaimRequest
					.ADD_APP_1_STAFF_ID;
				addApproverSetItem1.NUSNET_ID = !AppModel.claimRequest.createClaimRequest.ADD_APP_1_NUSNET_ID ? "" : AppModel.claimRequest.createClaimRequest
					.ADD_APP_1_NUSNET_ID;
				addApproverSetItem1.ULU = !AppModel.claimRequest.createClaimRequest.ADD_APP_1_ULU ? "" : AppModel.claimRequest.createClaimRequest
					.ADD_APP_1_ULU;
				addApproverSetItem1.FDLU = !AppModel.claimRequest.createClaimRequest.ADD_APP_1_FDLU ? "" : AppModel.claimRequest.createClaimRequest
					.ADD_APP_1_FDLU;
				addApproverSetItem1.STAFF_FULL_NAME = !AppModel.claimRequest.createClaimRequest.ADD_APP_1_STAFF_FULL_NAME ? "" : AppModel.claimRequest
					.createClaimRequest.ADD_APP_1_STAFF_FULL_NAME;

				addApproverSetItem2.PPNT_ID = !AppModel.claimRequest.createClaimRequest.ADDITIONAL_APP_2_PPNT_ID ? "" : AppModel.claimRequest.createClaimRequest
					.ADDITIONAL_APP_2_PPNT_ID;
				addApproverSetItem2.STAFF_ID = !AppModel.claimRequest.createClaimRequest.ADDITIONAL_APP_2_STAFF_ID ? "" : AppModel.claimRequest
					.createClaimRequest
					.ADDITIONAL_APP_2_STAFF_ID;
				addApproverSetItem2.NUSNET_ID = !AppModel.claimRequest.createClaimRequest.ADDITIONAL_APP_2_NUSNET_ID ? "" : AppModel.claimRequest
					.createClaimRequest
					.ADDITIONAL_APP_2_NUSNET_ID;
				addApproverSetItem2.ULU = !AppModel.claimRequest.createClaimRequest.ADDITIONAL_APP_2_ULU ? "" : AppModel.claimRequest.createClaimRequest
					.ADDITIONAL_APP_2_ULU;
				addApproverSetItem2.FDLU = !AppModel.claimRequest.createClaimRequest.ADDITIONAL_APP_2_FDLU ? "" : AppModel.claimRequest.createClaimRequest
					.ADDITIONAL_APP_2_FDLU;
				addApproverSetItem2.STAFF_FULL_NAME = !AppModel.claimRequest.createClaimRequest.ADDITIONAL_APP_2_STAFF_FULL_NAME ? "" :
					AppModel.claimRequest
					.createClaimRequest.ADDITIONAL_APP_2_STAFF_FULL_NAME;

			} else {
				saveObj.IS_CA = 'N';
				verifierSetItem.STAFF_ID = "";
				verifierSetItem.NUSNET_ID = "";
				verifierSetItem.ULU = "";
				verifierSetItem.FDLU = "";
				verifierSetItem.STAFF_FULL_NAME = "";
				verifierSetItem.PPNT_ID = "";
			}
			/** For Contingent workflow, we dont need the verifier for the task routing
			 * So we will send blank object
			 * To avoid issue with other eclaims
			 **/
			if (saveObj.CLAIM_TYPE === "102") {
				verifiersSet.push({});

			} else {
				verifiersSet.push(verifierSetItem);
			}

			saveObj.VERIFIER = verifiersSet;

			addApproversSet1.push(addApproverSetItem1);
			addApproversSet2.push(addApproverSetItem2);
			saveObj.ADDTIONAL_APPROVER_1 = addApproversSet1;
			saveObj.ADDTIONAL_APPROVER_2 = addApproversSet2;

			saveObj.ATTACHMENTS = [];
			saveObj.REMARKS = this.AppModel.getProperty("/claimRequest/createClaimRequest/REMARKS");
			saveObj.REQUEST_STATUS = AppModel.claimRequest.createClaimRequest.reqStatus ? AppModel.claimRequest.createClaimRequest.reqStatus :
				"01";
			saveObj.isMassUpload = "N";
			if (saveOrSubmit === 'Save') {
				saveObj.isSave = "Y";
				saveObj.ACTION = "SAVE";
			} else {
				if (saveOrSubmit === 'Submit') {
					saveObj.isSave = "N";
					saveObj.ACTION = "SUBMIT";

					saveObj.DRAFT_ID = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
				}
				if (saveOrSubmit === 'Check') {
					saveObj.ACTION = "CHECK";
				}
				if (saveOrSubmit === 'Reject') {
					saveObj.ACTION = "REJECT";
				}
				if (saveOrSubmit === 'Withdraw') {
					saveObj.ACTION = "WITHDRAW";
				}
				if (saveOrSubmit === 'Approve') {
					saveObj.ACTION = "APPROVE";
				}
				if (saveOrSubmit === 'Verify') {
					saveObj.ACTION = "VERIFY";
				}
				if (saveOrSubmit === 'Retract') {
					saveObj.ACTION = "RETRACT";
				}
			}
			saveObj.ROLE = AppModel.userRole;
			saveObj.REQUEST_ID = "";

			var itemsSet = [];
			var claimItems = AppModel.claimRequest.createClaimRequest.EclaimsItemDataDetails; //requestModel.getProperty('/selectedClaimDates');
			var localModel = this.getComponentModel("LookupModel");

			if (claimItems) {
				var newLineItem = 0;

				for (var i = 0; i < claimItems.length; i++) {
					var item = claimItems[i];
					var itemSetItem = {};
					//

					if (!item.ITEM_ID) {
						itemSetItem.ITEM_ID = ""
					} else {
						itemSetItem.ITEM_ID = item.ITEM_ID;
					}

					if (claimRequestType === 'Period') {
						var claimStartDate = Formatter.formatDateAsString(item.CLAIM_START_DATE, "yyyy-MM-dd", false, localModel.getProperty(
							"/monthNames"));
						var claimEndDate = Formatter.formatDateAsString(item.CLAIM_END_DATE, "yyyy-MM-dd", false, localModel.getProperty(
							"/monthNames"));
						itemSetItem.CLAIM_START_DATE = claimStartDate ? claimStartDate : "";
						itemSetItem.CLAIM_END_DATE = claimEndDate ? claimEndDate : "";
						itemSetItem.START_TIME = "00:00"; //"1899-12-30T06:59:35.000Z";
						itemSetItem.END_TIME = "23:59"; //"1899-12-30T10:29:35.000Z"; //item.endTime; //						
					} else {
						itemSetItem.CLAIM_START_DATE = item.CLAIM_START_DATE ? item.CLAIM_START_DATE : "";
						itemSetItem.CLAIM_END_DATE = item.CLAIM_END_DATE ? item.CLAIM_END_DATE : "";
						itemSetItem.START_TIME = item.START_TIME ? item.START_TIME : "00:00"; //"1899-12-30T06:59:35.000Z";
						itemSetItem.END_TIME = item.END_TIME ? item.END_TIME : "23:59"; //"1899-12-30T10:29:35.000Z"; //item.endTime; //
					}
					itemSetItem.CLAIM_START_DATE_DISPLAY = Formatter.formatDateAsString(new Date(itemSetItem.CLAIM_START_DATE), "dd Mmm, yyyy",
						false, localModel.getProperty("/monthNames"));
					itemSetItem.CLAIM_DAY = item.CLAIM_DAY ? item.CLAIM_DAY : "";
					// itemSetItem.START_TIME = item.START_TIME ? item.START_TIME : ""; //"1899-12-30T06:59:35.000Z";
					// itemSetItem.END_TIME = item.END_TIME ? item.END_TIME : ""; //"1899-12-30T10:29:35.000Z"; //item.endTime; //
					// itemSetItem.HOURS = item.HOURS ? item.HOURS : "";
					// itemSetItem.RATE_UNIT = item.RATE_UNIT ? item.RATE_UNIT : "";
					itemSetItem.HOURS_UNIT = item.HOURS_UNIT ? item.HOURS_UNIT : "";
					itemSetItem.RATE_TYPE = item.RATE_TYPE ? item.RATE_TYPE : "";

					// adding new field 'CLAIM_REQUEST_TYPE_NUMBER' by vinoth // 01.02.24
					itemSetItem.CLAIM_REQUEST_TYPE_NUMBER = item.RATE_TYPE ? item.RATE_TYPE : "";

					itemSetItem.CLAIM_DAY_TYPE = item.CLAIM_DAY_TYPE ? item.CLAIM_DAY_TYPE : "";
					itemSetItem.WBS = item.WBS ? item.WBS : "";
					if (AppModel.claimRequest.createClaimRequest.wbsOverwrite && saveObj.CLAIM_TYPE === '102') {
						itemSetItem.WBS = AppModel.claimRequest.createClaimRequest.wbsOverwrite;
					}
					// AppModel.claimRequest.createClaimRequest.wbsOverwrite
					itemSetItem.WAGE_CODE = item.WAGE_CODE ? item.WAGE_CODE : "";
					itemSetItem.REMARKS = item.REMARKS ? item.REMARKS : "";
					itemSetItem.TOTAL_AMOUNT = item.TOTAL_AMOUNT ? item.TOTAL_AMOUNT : "";
					itemSetItem.IS_DISCREPENCY = item.IS_DISCREPENCY ? 1 : 0;
					itemSetItem.RATE_TYPE_AMOUNT = item.RATE_TYPE_AMOUNT ? item.RATE_TYPE_AMOUNT : "";
					itemSetItem.DISC_RATETYPE_AMOUNT = item.DISC_RATETYPE_AMOUNT ? item.DISC_RATETYPE_AMOUNT : "";

					if (saveObj.CLAIM_TYPE == "102" || saveObj.CLAIM_TYPE == "103" || saveObj.CLAIM_TYPE == "104") {
						itemSetItem.IS_PH = item.IS_PH ? item.IS_PH : 0;
						// if (item.CLAIM_DAY_TYPE === 'Offday' && !(item.IS_PH !== 3 || item.IS_PH !== 5)) {
						// 	// item.IS_PH = 4;
						// 	// itemSetItem.IS_PH = item.IS_PH;
						// } else if (item.CLAIM_DAY_TYPE === 'Offday' && item.IS_PH === 2) {
						// 	if (item.RATE_TYPE === '18' && parseFloat(item.HOURS_UNIT) > 0) {
						// 		item.IS_PH = 5;
						// 		itemSetItem.IS_PH = item.IS_PH;
						// 	}
						// }
						if (item.CLAIM_DAY_TYPE === 'Offday' && saveObj.CLAIM_TYPE == "102" && (item.IS_PH === 2 || item.IS_PH === 5)) {
							if (parseFloat(itemSetItem.HOURS_UNIT) > 0) {
								itemSetItem.IS_PH = 5;
							} else {
								itemSetItem.IS_PH = 2;
							}

						}

					}

					// for 102 claim type and rate type monthly, no need to pass start time and end time
					if (saveObj.CLAIM_TYPE == "102") {
						//Sue requested on 22/11/2023 To store total amount as 0, because we are doing our calculation in the backend system for the total amount.
						itemSetItem.TOTAL_AMOUNT = "0.00";
						if (itemSetItem.RATE_TYPE === "18") {
							itemSetItem.START_TIME = "00:00"; //"1899-12-30T06:59:35.000Z";
							itemSetItem.END_TIME = "00:00"
						}

						// adding new field 'CLAIM_REQUEST_TYPE_NUMBER' by vinoth // 01.02.24
						saveObj.CLAIM_REQUEST_TYPE_NUMBER = item.RATE_TYPE ? item.RATE_TYPE : "";
					}

					itemsSet.push(itemSetItem);
				}
			}
			saveObj.selectedClaimDates = itemsSet;

			var aSaveObj = [];
			aSaveObj.push(saveObj);

			return aSaveObj;
		},
		onCancelSelectDatesForPlanningClaim: function () {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			if (this.AppModel.getProperty("/claimRequest/createClaimRequest/selectAllDatesApplied")) {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/selectAllDates", true);
			} else {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/selectAllDates", false);
			}
			this._oDateSelectPlanningCalendar.close();
			this._oDateSelectPlanningCalendar.destroy();
			this._oDateSelectPlanningCalendar = undefined;
			this._oDateSelectPlanningCalendar = null;
		},

		onPressSelectAll: function (oEvent) {

			var oCalendar = this.getUIControl("fragSelectPlanningCalendarDate--dateSelectionCalendarId");
			if (oEvent.getSource().getSelected()) {
				oEvent.getSource().setText("Unselect All");
				var dateToAddForSelection = new sap.ui.unified.DateRange();
				var startDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
				var endDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
				dateToAddForSelection.setProperty("startDate", startDate);
				oCalendar.removeAllSelectedDates();
				oCalendar.addSelectedDate(dateToAddForSelection);
				var noOfDays = endDate.getDate();
				var i;
				for (i = 0; i < noOfDays - 1; i++) {
					var newDateToAddForSelection = new sap.ui.unified.DateRange();
					var newDate = new Date(startDate);
					var nextDate = newDate.getDate() + (i + 1);
					newDate.setDate(nextDate);
					newDateToAddForSelection.setProperty("startDate", newDate);
					oCalendar.addSelectedDate(newDateToAddForSelection);
				}
				// this.AppModel.setProperty("/claimRequest/createClaimRequest/selectAllDates", true);
			} else {
				oCalendar.removeAllSelectedDates();
				oEvent.getSource().setText("Select All");
			}

		},
		onPressOkNApply: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");

			var startTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedStartTime");
			var endTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedEndTime");
			var regExpHhMm = new RegExp(/^([0-9]|0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$/);

			if (startTime && !regExpHhMm.test(startTime)) {
				return MessageBox.error("Please provide correct value for start time..!");
			} else if (endTime && !regExpHhMm.test(endTime)) {
				return MessageBox.error("Please provide correct value for end time..!");
			} else {
				if (claimType === '101') {
					this._fnHandlePTTDateSelection(oEvent);
				} else if (claimType === '103' || claimType === '104') {
					this._fnHandleOTDateSelection(oEvent);
				} else if (claimType === '102') {
					this._fnHandleCWDateSelection(oEvent);
				}
			}

			/*	if (claimType === '101') {
					this._fnHandlePTTDateSelection(oEvent);
				} else if (claimType === '103' || claimType === '104') {
					this._fnHandleOTDateSelection(oEvent);
				} else if (claimType === '102') {
					this._fnHandleCWDateSelection(oEvent);
				}*/

		},

		_fnHandlePTTDateSelection: function (oEvent) {
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var selectedRateTypeFromCalendarPopUp = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType");
			var oCalendar = this.getUIControl("fragSelectPlanningCalendarDate--dateSelectionCalendarId"),
				aSelectedDates = oCalendar.getSelectedDates(),
				oDate,
				i, j;
			var aExistingSelectedDates = this.AppModel.getProperty("/claimRequest/selectedDates");
			var aExistingDateTblData = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails").length ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails") : [];
			var aEclaimsItemDataDates = !!this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") : [];
			if (aSelectedDates.length > 0 && selectedRateTypeFromCalendarPopUp) {
				var localModel = this.getComponentModel("LookupModel");
				var shiftDateElement;
				var userRole = this.AppModel.getProperty("/userRole");
				for (i = 0; i < aSelectedDates.length; i++) {
					oDate = aSelectedDates[i].getStartDate();
					var oDateFormatStartDate = Formatter.formatDateAsString(oDate, "yyyy-MM-dd");
					//to check for this selected date what are the possible rate types and rate amounts applicable
					//var selectedMonthRateNamount = this.AppModel.getProperty("/claimRequest/rateAmountList");
					var selMonthRateTypeNamountList = this.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
					var selectedDayListAmountSet = [];
					var selectedDayListRateTypeSet = [];
					var countOfSelRateTypFrmCalPopInRateTypList = 0;
					if (selMonthRateTypeNamountList) {
						for (j = 0; j < selMonthRateTypeNamountList.length; j++) {
							var item = selMonthRateTypeNamountList[j];
							var prevRateType;
							//	var prevAmount;
							for (var n = 0; n < item.aAmountListitems.length; n++) {
								var rateTypeListSetItem = {};
								var amountListSetItem = {};
								var amountNotUnique = 'N';
								var oAmountListItem = item.aAmountListitems[n];
								var startDate = Formatter.formatDateAsString(oAmountListItem.START_DATE, "yyyy-MM-dd");
								var endDate = Formatter.formatDateAsString(oAmountListItem.END_DATE, "yyyy-MM-dd");
								if (oDateFormatStartDate >= startDate && oDateFormatStartDate <= endDate) {

									amountListSetItem.AMOUNT = oAmountListItem.AMOUNT;
									//	if (selMonthRateTypeNamountList.length === 1) {
									//	selectedDayListAmountSet.push(amountListSetItem);
									//	}
									if (selectedRateTypeFromCalendarPopUp === item.RateTypeCode) {
										//		if (prevAmount != oAmountListItem.AMOUNT) {
										for (var m = 0; m < selectedDayListAmountSet.length; m++) {
											if (selectedDayListAmountSet[m].AMOUNT === oAmountListItem.AMOUNT) {
												amountNotUnique = 'Y';
												break;
											}
										}
										if (amountNotUnique === 'N') {
											selectedDayListAmountSet.push(amountListSetItem);
											countOfSelRateTypFrmCalPopInRateTypList = countOfSelRateTypFrmCalPopInRateTypList + 1;
										}
										var defaultRateAmount = oAmountListItem.AMOUNT;

									}
									//	rateTypeListSetItem.RateTypeId = item.RATE_TYPE_C;
									rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
									rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
									//rateTypeListSetItem.AMOUNT = oAmountListItem.AMOUNT;
									rateTypeListSetItem.MAX_LIMIT = oAmountListItem.MAX_LIMIT;
									//	if (j > 0) {

									//	}
									if (prevRateType != item.RateTypeCode) {
										selectedDayListRateTypeSet.push(rateTypeListSetItem);
									}
									prevRateType = selMonthRateTypeNamountList[j].RateTypeCode;
									//	prevAmount = oAmountListItem.AMOUNT;
								}
							}
							prevRateType = undefined;
							//		prevAmount = undefined;

						}
						// //remove the duplicates from the rate type array
						// //selectedDayListRateTypeSet
						// //Sort the Array of Rate Type Drop down values
						// selectedDayListRateTypeSet.sort(
						// 	(objA, objB) => Number(new Date(objA.RateTypeCode)) - Number(new Date(objB.RateTypeCode)),
						// );
						// //Remove the duplicates from the Array of Rate Type Drop down values
						// const aUniqueItemsSet = selectedDayListRateTypeSet.filter((value, index) => {
						// 	const _value = JSON.stringify(value);
						// 	return index === selectedDayListRateTypeSet.findIndex(obj => {
						// 		return JSON.stringify(obj) === _value;
						// 	});
						// });
						//
					}
					if (countOfSelRateTypFrmCalPopInRateTypList === 1 && userRole != 'ESS') {
						var rateAmountForSelectedDate = defaultRateAmount;

					} else {
						rateAmountForSelectedDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp");
					}
					//		selectedDayListAmountSet.unshift('');
					//		selectedDayListRateTypeSet.unshift('');
					//
					if (aEclaimsItemDataDates.indexOf(oDateFormatStartDate) === -1) {
						aEclaimsItemDataDates.push(oDateFormatStartDate);
					} else {
						continue;
					}

					//testing
					var startTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedStartTime");
					var endTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedEndTime");
					var hoursOrUnit = this.AppModel.getProperty("/claimRequest/createClaimRequest/hoursOrUnit");
					var differenceHours = hoursOrUnit;
					var calcDifferenceHours;
					if (differenceHours) {
						calcDifferenceHours = parseFloat(differenceHours).toFixed(2);
					}
					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/
					// if (claimType === this.getI18n("PTT") && differenceHours >= 8) {
					// if (differenceHours >= 8) {
					// 	if (claimType === this.getI18n("PTT") && differenceHours >= 8) {
					// 		calcDifferenceHours = differenceHours - 1;
					// 	}

					// 	calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					// }
					/**** End of Change for Computation Logic *****/
					/*	if (oDate.getDay() >= 1 && oDate.getDay() <= 4) {
							if (differenceHours >= 8.5) {
								calcDifferenceHours = differenceHours - 1;
								calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
							}

						} else if (oDate.getDay() === 5) {
							if (differenceHours >= 8) {
								calcDifferenceHours = differenceHours - 1;
								calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
							}
						}*/

					//testing
					shiftDateElement = {
						"CLAIM_START_DATE_DISPLAY": Formatter.formatDateAsString(oDate, "dd Mmm, yyyy", false, localModel.getProperty("/monthNames")),
						"CLAIM_START_DATE": Formatter.formatDateAsString(oDate, "yyyy-MM-dd"),
						"CLAIM_END_DATE": Formatter.formatDateAsString(oDate, "yyyy-MM-dd"),
						"CLAIM_DAY": localModel.getProperty("/days")[oDate.getDay()],
						"CLAIM_DAY_TYPE": "Workday",
						"WBS": this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsElementCode"),
						"WBS_DESC": this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsDesc"),
						"START_TIME": startTime,
						"END_TIME": endTime,
						"RATE_TYPE": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType"),
						"RATE_TYPE_AMOUNT": rateAmountForSelectedDate, //this.AppModel.getProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp"),
						"TOTAL_AMOUNT": this.AppModel.getProperty("/claimRequest/createClaimRequest/totalAmountFromCalendarPopUp"),
						//	"RATE_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/ratePerUnit"),
						// "HOURS_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "Hourly" ? Formatter.calculateHours(
						// 	startTime, endTime) : this.AppModel.getProperty("/claimRequest/createClaimRequest/hoursOrUnit"),
						"HOURS_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "10" ? calcDifferenceHours : this.AppModel
							.getProperty("/claimRequest/createClaimRequest/hoursOrUnit"),
						//	"HOURS": Formatter.calculateHours(startTime, endTime),
						// "RateTypeDetails": [{
						// 	"RateTypeDesc": Formatter.formatDateAsString(oDate, "yyyy-MM-dd")
						// }]
						"RateTypeDetails": selectedDayListRateTypeSet,
						"selectedDayListAmountSet": selectedDayListAmountSet,
						"valueStateWbs": Utility._fnAppModelGetProperty(this, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs"),
						"valueStateTextWbs": Utility._fnAppModelGetProperty(this, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs")
					};

					//handling total amount
					if (shiftDateElement.HOURS_UNIT && shiftDateElement.RATE_TYPE_AMOUNT) {
						//begin of change wrt CR REQ000002572681 
						//changed parseInt to parseFloat in the below line so that decimal value is not lost in case it's there						
						//	shiftDateElement.TOTAL_AMOUNT = parseInt(shiftDateElement.HOURS_UNIT, 10) * shiftDateElement.RATE_TYPE_AMOUNT;
						shiftDateElement.TOTAL_AMOUNT = parseFloat(shiftDateElement.HOURS_UNIT) * shiftDateElement.RATE_TYPE_AMOUNT;
						//end of change wrt CR REQ000002572681 
						shiftDateElement.TOTAL_AMOUNT = parseFloat(shiftDateElement.TOTAL_AMOUNT).toFixed(2);
					}
					// end of handling total amount
					aExistingDateTblData.push(shiftDateElement);
					aExistingSelectedDates.push({
						"startDate": oDate,
						"endDate": oDate
					});

				}
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates", aEclaimsItemDataDates);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aExistingDateTblData);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRowCount", aExistingDateTblData.length);
				this.AppModel.setProperty("/claimRequest/selectedDates", aExistingSelectedDates);

				this.onCancelSelectDatesForPlanningClaim();
				//Route to Master-Detail Pattern
				// this.handleRouting("detail", {
				// 	//	layout: "TwoColumnsMidExpanded",
				// 	//commented the above line to ensure whenever dates are selected it comes in full screen	
				// 	layout: "MidColumnFullScreen",
				// 	project: this._project
				// });
			} else {
				var sErrorMessage = "";
				if (claimType == "101") {
					sErrorMessage = 'Please select Rate Type dates from the calendar before clicking "Apply".';
				} else {
					sErrorMessage = 'Please select dates from calendar before clicking "Apply".'
				}
				MessageBox.error(sErrorMessage);
			}
		},
		onSelectionChangeClaimDayType: function (oEvent) {
			var sKey = oEvent.getSource().getSelectedKey();
			var oContextPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var objData = this.AppModel.getProperty(oContextPath);
			var claimDay = objData.CLAIM_DAY;
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var boolIsPh = 0;
			var aHolidayList = this.AppModel.getProperty("/holidayList");
			for (var u = 0; u < aHolidayList.length; u++) {
				var oHoliday = aHolidayList[u];
				var sHolidayDate = Formatter.formatDateAsString(oHoliday.DATE, "yyyy-MM-dd");
				if (sHolidayDate == objData.CLAIM_START_DATE) {

					boolIsPh = 2;
				}
			}

			if (sKey === 'Restday') {
				// objData.IS_PH = 1;
				if (boolIsPh > 1) {
					objData.IS_PH = 2;
				} else {
					objData.IS_PH = 1;
				}

			} else if (sKey === 'Offday') {
				if (boolIsPh === 2) {
					if(claimType === '103'){
							objData.IS_PH = 4;	
					}else{
						objData.IS_PH = 2;	
					}
					
				} else {
					objData.IS_PH = 3;
				}
			} else {
				if (boolIsPh > 1) {
					objData.IS_PH = 2;
				} else {
					objData.IS_PH = 0;
				}
			}

			if (sKey === 'Workday' && claimType === '102' && objData.RATE_TYPE === '18') {

				if (objData.CLAIM_DAY === "Monday" || objData.CLAIM_DAY === "Tuesday" || objData.CLAIM_DAY === "Wednesday" ||
					objData.CLAIM_DAY === "Thursday") {
					objData.HOURS_UNIT = "8.50";
				} else {
					objData.HOURS_UNIT = "8.00";
				}

			} else if ((sKey === 'Offday' || sKey === 'Restday') && claimType === '102' && objData.RATE_TYPE === '18') {
				objData.HOURS_UNIT = "0.00";
			}

			this.AppModel.setProperty(oContextPath, objData);
		},
		_fnHandleCWDateSelection: function (oEvent) {
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var selectedRateTypeFromCalendarPopUp = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType");
			var oCalendar = this.getUIControl("fragSelectPlanningCalendarDate--dateSelectionCalendarId"),
				aSelectedDates = oCalendar.getSelectedDates(),
				oDate,
				i, j;
			var aExistingSelectedDates = this.AppModel.getProperty("/claimRequest/selectedDates");
			var aExistingDateTblData = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails").length ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails") : [];
			var aEclaimsItemDataDates = !!this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") : [];
			var wageCode = "";
			if (aSelectedDates.length > 0 && selectedRateTypeFromCalendarPopUp) {
				var localModel = this.getComponentModel("LookupModel");
				var shiftDateElement;
				var userRole = this.AppModel.getProperty("/userRole");
				for (i = 0; i < aSelectedDates.length; i++) {
					oDate = aSelectedDates[i].getStartDate();
					var oDateFormatStartDate = Formatter.formatDateAsString(oDate, "yyyy-MM-dd");
					//to check for this selected date what are the possible rate types and rate amounts applicable
					//var selectedMonthRateNamount = this.AppModel.getProperty("/claimRequest/rateAmountList");
					var selMonthRateTypeNamountList = this.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
					var selectedDayListAmountSet = [];
					var selectedDayListRateTypeSet = [];
					var countOfSelRateTypFrmCalPopInRateTypList = 0;
					if (selMonthRateTypeNamountList) {
						for (j = 0; j < selMonthRateTypeNamountList.length; j++) {
							var item = selMonthRateTypeNamountList[j];
							// wageCode = item.WAGE_CODE;
							var prevRateType;
							//	var prevAmount;
							for (var n = 0; n < item.aAmountListitems.length; n++) {
								var rateTypeListSetItem = {};
								var amountListSetItem = {};
								var amountNotUnique = 'N';
								var oAmountListItem = item.aAmountListitems[n];
								var startDate = Formatter.formatDateAsString(oAmountListItem.START_DATE, "yyyy-MM-dd");
								var endDate = Formatter.formatDateAsString(oAmountListItem.END_DATE, "yyyy-MM-dd");
								if (oDateFormatStartDate >= startDate && oDateFormatStartDate <= endDate) {

									amountListSetItem.AMOUNT = oAmountListItem.AMOUNT;
									amountListSetItem.WAGE_CODE = oAmountListItem.WAGE_CODE;
									//	if (selMonthRateTypeNamountList.length === 1) {
									//	selectedDayListAmountSet.push(amountListSetItem);
									//	}
									if (selectedRateTypeFromCalendarPopUp === item.RateTypeCode) {
										//		if (prevAmount != oAmountListItem.AMOUNT) {
										for (var m = 0; m < selectedDayListAmountSet.length; m++) {
											if (selectedDayListAmountSet[m].AMOUNT === oAmountListItem.AMOUNT) {
												amountNotUnique = 'Y';
												break;
											}
										}
										if (amountNotUnique === 'N') {
											selectedDayListAmountSet.push(amountListSetItem);
											countOfSelRateTypFrmCalPopInRateTypList = countOfSelRateTypFrmCalPopInRateTypList + 1;
										}
										var defaultRateAmount = oAmountListItem.AMOUNT;
										var defaultWageCode = oAmountListItem.WAGE_CODE;

									}
									//	rateTypeListSetItem.RateTypeId = item.RATE_TYPE_C;
									rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
									rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
									//rateTypeListSetItem.AMOUNT = oAmountListItem.AMOUNT;
									rateTypeListSetItem.MAX_LIMIT = oAmountListItem.MAX_LIMIT;
									//	if (j > 0) {

									//	}
									if (prevRateType != item.RateTypeCode) {
										selectedDayListRateTypeSet.push(rateTypeListSetItem);
									}
									prevRateType = selMonthRateTypeNamountList[j].RateTypeCode;
									//	prevAmount = oAmountListItem.AMOUNT;
								}
							}
							prevRateType = undefined;
							//		prevAmount = undefined;

						}
						// //remove the duplicates from the rate type array
						// //selectedDayListRateTypeSet
						// //Sort the Array of Rate Type Drop down values
						// selectedDayListRateTypeSet.sort(
						// 	(objA, objB) => Number(new Date(objA.RateTypeCode)) - Number(new Date(objB.RateTypeCode)),
						// );
						// //Remove the duplicates from the Array of Rate Type Drop down values
						// const aUniqueItemsSet = selectedDayListRateTypeSet.filter((value, index) => {
						// 	const _value = JSON.stringify(value);
						// 	return index === selectedDayListRateTypeSet.findIndex(obj => {
						// 		return JSON.stringify(obj) === _value;
						// 	});
						// });
						//
					}
					if (countOfSelRateTypFrmCalPopInRateTypList === 1) {
						var rateAmountForSelectedDate = defaultRateAmount;
						var wageCodeForSelectedDate = defaultWageCode;

					} else {
						rateAmountForSelectedDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp");
						wageCodeForSelectedDate = "";
					}
					//		selectedDayListAmountSet.unshift('');
					//		selectedDayListRateTypeSet.unshift('');
					//
					if (aEclaimsItemDataDates.indexOf(oDateFormatStartDate) === -1) {
						aEclaimsItemDataDates.push(oDateFormatStartDate);
					} else {
						continue;
					}

					//testing
					var startTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedStartTime");
					var endTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedEndTime");
					var hoursOrUnit = this.AppModel.getProperty("/claimRequest/createClaimRequest/hoursOrUnit");
					var differenceHours = hoursOrUnit;
					var calcDifferenceHours;
					if (differenceHours) {
						calcDifferenceHours = parseFloat(differenceHours).toFixed(2);
					}
					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/
					// if (claimType === this.getI18n("PTT") && differenceHours >= 8) {
					/*if (differenceHours >= 8) {
						if (claimType === this.getI18n("PTT") && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}

						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}*/
					/**** End of Change for Computation Logic *****/
					/*	if (oDate.getDay() >= 1 && oDate.getDay() <= 4) {
							if (differenceHours >= 8.5) {
								calcDifferenceHours = differenceHours - 1;
								calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
							}

						} else if (oDate.getDay() === 5) {
							if (differenceHours >= 8) {
								calcDifferenceHours = differenceHours - 1;
								calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
							}
						}*/

					var boolIsPh = 0;
					var aHolidayList = this.AppModel.getProperty("/holidayList");
					for (var u = 0; u < aHolidayList.length; u++) {
						var oHoliday = aHolidayList[u];
						var sHolidayDate = Formatter.formatDateAsString(oHoliday.DATE, "yyyy-MM-dd");
						if (sHolidayDate == oDateFormatStartDate) {
							boolIsPh = 2;
						}
					}

					//testing
					shiftDateElement = {
						"CLAIM_START_DATE_DISPLAY": Formatter.formatDateAsString(oDate, "dd Mmm, yyyy", false, localModel.getProperty("/monthNames")),
						"CLAIM_START_DATE": Formatter.formatDateAsString(oDate, "yyyy-MM-dd"),
						"CLAIM_END_DATE": Formatter.formatDateAsString(oDate, "yyyy-MM-dd"),
						"CLAIM_DAY": localModel.getProperty("/days")[oDate.getDay()],
						"CLAIM_DAY_TYPE": "Workday",
						"WBS": this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite"),
						"WBS_DESC": this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwriteDesc"),
						"START_TIME": startTime,
						"END_TIME": endTime,
						"RATE_TYPE": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType"),
						"RATE_TYPE_AMOUNT": rateAmountForSelectedDate, //this.AppModel.getProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp"),
						"TOTAL_AMOUNT": this.AppModel.getProperty("/claimRequest/createClaimRequest/totalAmountFromCalendarPopUp"),
						"HOURS_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "10" ? calcDifferenceHours : this.AppModel
							.getProperty("/claimRequest/createClaimRequest/hoursOrUnit"),
						"RateTypeDetails": selectedDayListRateTypeSet,
						"WAGE_CODE": wageCodeForSelectedDate,
						"selectedDayListAmountSet": selectedDayListAmountSet,
						"valueStateWbs": Utility._fnAppModelGetProperty(this, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs"),
						"valueStateTextWbs": Utility._fnAppModelGetProperty(this, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs")
					};

					if (shiftDateElement.CLAIM_DAY === "Sunday") {
						shiftDateElement.CLAIM_DAY_TYPE = "Restday";
						shiftDateElement.IS_PH = 1;
					} else if (shiftDateElement.CLAIM_DAY === "Saturday") {
						shiftDateElement.CLAIM_DAY_TYPE = "Offday";
						shiftDateElement.IS_PH = 3;
					}
					if (boolIsPh === 2) {
						shiftDateElement.IS_PH = 2;
						if (shiftDateElement.CLAIM_DAY === "Sunday") { // check if public holiday is rest day or not
							shiftDateElement.CLAIM_DAY_TYPE = "Restday";
							// shiftDateElement.IS_PH = 1;
						} else if (shiftDateElement.CLAIM_DAY === "Saturday") {
							shiftDateElement.CLAIM_DAY_TYPE = "Offday";
							shiftDateElement.IS_PH = 5;
						} else {
							shiftDateElement.CLAIM_DAY_TYPE = "Workday";
							// shiftDateElement.IS_PH = 2;
						}

					}

					//handling total amount
					if (shiftDateElement.HOURS_UNIT && shiftDateElement.RATE_TYPE_AMOUNT) {
						//begin of change wrt CR REQ000002572681 
						//changed parseInt to parseFloat in the below line so that decimal value is not lost in case it's there						
						//	shiftDateElement.TOTAL_AMOUNT = parseInt(shiftDateElement.HOURS_UNIT, 10) * shiftDateElement.RATE_TYPE_AMOUNT;
						shiftDateElement.TOTAL_AMOUNT = parseFloat(shiftDateElement.HOURS_UNIT) * shiftDateElement.RATE_TYPE_AMOUNT;
						//end of change wrt CR REQ000002572681 
						shiftDateElement.TOTAL_AMOUNT = parseFloat(shiftDateElement.TOTAL_AMOUNT).toFixed(2);
					}
					// end of handling total amount
					aExistingDateTblData.push(shiftDateElement);
					aExistingSelectedDates.push({
						"startDate": oDate,
						"endDate": oDate
					});

				}
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates", aEclaimsItemDataDates);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aExistingDateTblData);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRowCount", aExistingDateTblData.length);
				this.AppModel.setProperty("/claimRequest/selectedDates", aExistingSelectedDates);

				this.onCancelSelectDatesForPlanningClaim();
				//Route to Master-Detail Pattern
				// this.handleRouting("detail", {
				// 	//	layout: "TwoColumnsMidExpanded",
				// 	//commented the above line to ensure whenever dates are selected it comes in full screen	
				// 	layout: "MidColumnFullScreen",
				// 	project: this._project
				// });
			} else {
				var sErrorMessage = "";
				//				if (claimType == "102") {
				sErrorMessage = 'Please select Rate Type and dates from the calendar before clicking "Apply".';
				//} else {
				//sErrorMessage = "Please select dates from calendar before pressing apply!"
				//}
				MessageBox.error(sErrorMessage);
			}
		},
		_fnHandleOTDateSelection: function (oEvent) {
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var oCalendar = this.getUIControl("fragSelectPlanningCalendarDate--dateSelectionCalendarId"),
				aSelectedDates = oCalendar.getSelectedDates(),
				oDate,
				i, j;
			var aExistingSelectedDates = this.AppModel.getProperty("/claimRequest/selectedDates");
			var aExistingDateTblData = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails").length ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails") : [];
			var aEclaimsItemDataDates = !!this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") ? this.AppModel
				.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates") : [];
			if (aSelectedDates.length > 0) {
				var localModel = this.getComponentModel("LookupModel");
				var shiftDateElement;
				var userRole = this.AppModel.getProperty("/userRole");
				for (i = 0; i < aSelectedDates.length; i++) {
					oDate = aSelectedDates[i].getStartDate();
					var oDateFormatStartDate = Formatter.formatDateAsString(oDate, "yyyy-MM-dd");
					//to check for this selected date what are the possible rate types and rate amounts applicable
					//var selectedMonthRateNamount = this.AppModel.getProperty("/claimRequest/rateAmountList");
					// var selMonthRateTypeNamountList = this.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
					var selectedDayListAmountSet = [];
					var selectedDayListRateTypeSet = [];
					var countOfSelRateTypFrmCalPopInRateTypList = 0;
					/*if (selMonthRateTypeNamountList) {
						for (j = 0; j < selMonthRateTypeNamountList.length; j++) {
							var item = selMonthRateTypeNamountList[j];
							var prevRateType;
							//	var prevAmount;
							for (var n = 0; n < item.aAmountListitems.length; n++) {
								var rateTypeListSetItem = {};
								var amountListSetItem = {};
								var amountNotUnique = 'N';
								var oAmountListItem = item.aAmountListitems[n];
								var startDate = Formatter.formatDateAsString(oAmountListItem.START_DATE, "yyyy-MM-dd");
								var endDate = Formatter.formatDateAsString(oAmountListItem.END_DATE, "yyyy-MM-dd");
								if (oDateFormatStartDate >= startDate && oDateFormatStartDate <= endDate) {

									amountListSetItem.AMOUNT = oAmountListItem.AMOUNT;
									//	if (selMonthRateTypeNamountList.length === 1) {
									//	selectedDayListAmountSet.push(amountListSetItem);
									//	}
									if (selectedRateTypeFromCalendarPopUp === item.RateTypeCode) {
										//		if (prevAmount != oAmountListItem.AMOUNT) {
										for (var m = 0; m < selectedDayListAmountSet.length; m++) {
											if (selectedDayListAmountSet[m].AMOUNT === oAmountListItem.AMOUNT) {
												amountNotUnique = 'Y';
												break;
											}
										}
										if (amountNotUnique === 'N') {
											selectedDayListAmountSet.push(amountListSetItem);
											countOfSelRateTypFrmCalPopInRateTypList = countOfSelRateTypFrmCalPopInRateTypList + 1;
										}
										var defaultRateAmount = oAmountListItem.AMOUNT;

									}
									//	rateTypeListSetItem.RateTypeId = item.RATE_TYPE_C;
									rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
									rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
									//rateTypeListSetItem.AMOUNT = oAmountListItem.AMOUNT;
									rateTypeListSetItem.MAX_LIMIT = oAmountListItem.MAX_LIMIT;
									//	if (j > 0) {

									//	}
									if (prevRateType != item.RateTypeCode) {
										selectedDayListRateTypeSet.push(rateTypeListSetItem);
									}
									prevRateType = selMonthRateTypeNamountList[j].RateTypeCode;
									//	prevAmount = oAmountListItem.AMOUNT;
								}
							}
							prevRateType = undefined;
							//		prevAmount = undefined;

						}
					}*/
					if (aEclaimsItemDataDates.indexOf(oDateFormatStartDate) === -1) {
						aEclaimsItemDataDates.push(oDateFormatStartDate);
					} else {
						continue;
					}

					//testing
					var startTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedStartTime");
					var endTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedEndTime");
					var hoursOrUnit = this.AppModel.getProperty("/claimRequest/createClaimRequest/hoursOrUnit");
					var differenceHours = hoursOrUnit;
					var calcDifferenceHours;
					if (differenceHours) {
						calcDifferenceHours = parseFloat(differenceHours).toFixed(2);
					}
					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/
					// if ((claimType === this.getI18n("OT_EA") || claimType === this.getI18n("OT_NON_EA")) && differenceHours >= 8) {
					if (differenceHours >= 8) {
						// calcDifferenceHours = differenceHours - 1;
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					var boolIsPh = 0;
					var aHolidayList = this.AppModel.getProperty("/holidayList");
					for (var u = 0; u < aHolidayList.length; u++) {
						var oHoliday = aHolidayList[u];
						var sHolidayDate = Formatter.formatDateAsString(oHoliday.DATE, "yyyy-MM-dd");
						if (sHolidayDate == oDateFormatStartDate) {
							boolIsPh = 2;
						}
					}

					//testing
					shiftDateElement = {
						"CLAIM_START_DATE_DISPLAY": Formatter.formatDateAsString(oDate, "dd Mmm, yyyy", false, localModel.getProperty("/monthNames")),
						"CLAIM_START_DATE": Formatter.formatDateAsString(oDate, "yyyy-MM-dd"),
						"CLAIM_END_DATE": Formatter.formatDateAsString(oDate, "yyyy-MM-dd"),
						"CLAIM_DAY": localModel.getProperty("/days")[oDate.getDay()],
						"CLAIM_DAY_TYPE": "Workday",
						"WBS": this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsElementCode"),
						"WBS_DESC": this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsDesc"),
						"START_TIME": startTime,
						"END_TIME": endTime,
						"RATE_TYPE": "", //this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType"),
						"RATE_TYPE_AMOUNT": "", //rateAmountForSelectedDate, //this.AppModel.getProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp"),
						"TOTAL_AMOUNT": "", //this.AppModel.getProperty("/claimRequest/createClaimRequest/totalAmountFromCalendarPopUp"),
						//	"RATE_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/ratePerUnit"),
						// "HOURS_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "Hourly" ? Formatter.calculateHours(
						// 	startTime, endTime) : this.AppModel.getProperty("/claimRequest/createClaimRequest/hoursOrUnit"),
						"HOURS_UNIT": this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType") === "10" ? calcDifferenceHours : this.AppModel
							.getProperty("/claimRequest/createClaimRequest/hoursOrUnit"),
						//	"HOURS": Formatter.calculateHours(startTime, endTime),
						// "RateTypeDetails": [{
						// 	"RateTypeDesc": Formatter.formatDateAsString(oDate, "yyyy-MM-dd")
						// }]
						"IS_PH": boolIsPh,
						"RateTypeDetails": selectedDayListRateTypeSet,
						"selectedDayListAmountSet": selectedDayListAmountSet,
						"valueStateWbs": Utility._fnAppModelGetProperty(this, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs"),
						"valueStateTextWbs": Utility._fnAppModelGetProperty(this, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs")
					};

					if (shiftDateElement.CLAIM_DAY === "Sunday") {
						shiftDateElement.CLAIM_DAY_TYPE = "Restday";
						shiftDateElement.IS_PH = 1;
					}
					if (boolIsPh === 2) {
						shiftDateElement.IS_PH = 2;
						if (shiftDateElement.CLAIM_DAY === "Sunday") { // check if public holiday is rest day or not
							shiftDateElement.CLAIM_DAY_TYPE = "Restday";
							// shiftDateElement.IS_PH = 1;
						} else {
							shiftDateElement.CLAIM_DAY_TYPE = "Workday";
							// shiftDateElement.IS_PH = 2;
						}

					}

					//handling total amount
					if (shiftDateElement.HOURS_UNIT && shiftDateElement.RATE_TYPE_AMOUNT) {
						shiftDateElement.TOTAL_AMOUNT = parseInt(shiftDateElement.HOURS_UNIT, 10) * shiftDateElement.RATE_TYPE_AMOUNT;
						shiftDateElement.TOTAL_AMOUNT = parseFloat(shiftDateElement.TOTAL_AMOUNT).toFixed(2);
					}
					// end of handling total amount
					aExistingDateTblData.push(shiftDateElement);
					aExistingSelectedDates.push({
						"startDate": oDate,
						"endDate": oDate
					});

				}
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDates", aEclaimsItemDataDates);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aExistingDateTblData);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/claimRowCount", aExistingDateTblData.length);
				this.AppModel.setProperty("/claimRequest/selectedDates", aExistingSelectedDates);

				this.onCancelSelectDatesForPlanningClaim();
				//Route to Master-Detail Pattern
				// this.handleRouting("detail", {
				// 	//	layout: "TwoColumnsMidExpanded",
				// 	//commented the above line to ensure whenever dates are selected it comes in full screen	
				// 	layout: "MidColumnFullScreen",
				// 	project: this._project
				// });
			} else {
				var sErrorMessage = "Please select dates from calendar before pressing apply..!"
				MessageBox.error(sErrorMessage);
			}
		},

		handleValueHelpAdditionalApprover: function (oEvent, sValue) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			var oView = this.getView();
			var oButton = oEvent.getSource();
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var filters = [];
			if (sValue === "ADD_APPROVER_2") {
				var sNusnetID = this.AppModel.getProperty("/claimRequest/createClaimRequest/ADDTIONAL_APPROVER_1/0/NUSNET_ID");
				filters = this.generateFilter("NUSNET_ID ", [sNusnetID.toString()], "sap.ui.model.FilterOperator.NE");
			}
			if (!this._oDialogAddApprover) {
				this._oDialogAddApprover = Fragment.load({
					id: oView.getId(),
					name: "nus.edu.sg.claimrequest.view.fragments.detaillayout.AdditionalApproverValueHelpDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}

			this._oDialogAddApprover.then(function (oDialog) {
				oDialog.setRememberSelections(false);
				oDialog.open();
			}.bind(this));

		},
		handleValueHelpAdditionalApprover2: function (oEvent, sValue) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			var oView = this.getView();
			var oButton = oEvent.getSource();
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var filters = [];
			if (!this._oDialogAddApprover2) {
				this._oDialogAddApprover2 = Fragment.load({
					id: oView.getId(),
					name: "nus.edu.sg.claimrequest.view.fragments.detaillayout.AdditionalApproverValueHelpDialog2",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}

			this._oDialogAddApprover2.then(function (oDialog) {
				oDialog.setRememberSelections(false);
				oDialog.open();
			}.bind(this));
		},
		onPressAddAdditionalApprover: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			if (!Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID")) {
				MessageBox.error("Please provide first additional approver");
				return;
			}
			this.AppModel.setProperty("/showAdditonalApprover2", true);
			this.AppModel.setProperty("/showAdditionalApproverLink", false);
			this.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
			this.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
		},
		onPressRemoveAdditionalApprover: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			Utility._fnAppModelSetProperty(this, "/showAdditonalApprover2", false);
			Utility._fnAppModelSetProperty(this, "/showAdditionalApproverLink", true);
			Utility._fnAppModelSetProperty(this, "/showRemoveAdditionalApproverLink", false);
			this.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADDTIONAL_APPROVER_2", []);
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID", "");
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID", "");
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_ULU", "");
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_FDLU", "");
			Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME", "");
			this.getView().byId("inpAddApprv2ValueHelp").removeAllTokens([]);
		},

		handleValueHelpVerifier: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			var oView = this.getView();
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
			var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
			var andFilter = [];
			var aFilter = [];
			//Changed the STAFF_USER_GRP filter value from NUS_CHRS_ECLAIMS_VERIFIER to VERIFIER
			//andFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, ['NUS_CHRS_ECLAIMS_VERIFIER']));
			andFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, ['VERIFIER']));
			andFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, ulu));
			andFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, fdlu));
			//new filter for add validity
			var currentDate = new Date();
			andFilter.push(new sap.ui.model.Filter("APM_VALID_FROM", FilterOperator.LE, currentDate));
			andFilter.push(new sap.ui.model.Filter("APM_VALID_TO", FilterOperator.GE, currentDate));
			//
			aFilter.push(new sap.ui.model.Filter(andFilter, true));

			EclaimSrvModel.read("/EclaimsApprovalMatrixViews", {
				filters: aFilter,
				success: function (oData) {
					if (oData.results.length) {
						this.AppModel.setProperty("/Verifier", oData.results);
						if (!this._oDialogVerifer) {
							this._oDialogVerifer = Fragment.load({
								id: oView.getId(),
								name: "nus.edu.sg.claimrequest.view.fragments.detaillayout.VerifierValueHelpDialog",
								controller: this
							}).then(function (oDialog) {
								oView.addDependent(oDialog);
								return oDialog;
							});
						}

						this._oDialogVerifer.then(function (oDialog) {
							oDialog.setRememberSelections(false);
							oDialog.open();
						}.bind(this));
					} else {

					}
				}.bind(this),
				error: function (oError) {

				}
			});
		},
		handleConfirmVerifier: function (oEvent) {
			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);

			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedVerifier = this.AppModel.getProperty(sPath);
				var objVerifier = {
					"STAFF_ID": objSelectedVerifier.STAFF_ID,
					"NUSNET_ID": objSelectedVerifier.STAFF_NUSNET_ID,
					"ULU": objSelectedVerifier.ULU,
					"FDLU": objSelectedVerifier.FDLU,
					"STAFF_FULL_NAME": objSelectedVerifier.FULL_NM
				};

				//	this.AppModel.setProperty("/claimRequest/createClaimRequest/VERIFIER", [objVerifier]);
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_STAFF_ID", objSelectedVerifier.STAFF_ID);
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID", objSelectedVerifier.STAFF_NUSNET_ID);
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_ULU", objSelectedVerifier.ULU);
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_FDLU", objSelectedVerifier.FDLU);
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME", objSelectedVerifier.FULL_NM);
				this._fnAddToken(this.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(this,
					"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(this,
					"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
			}
		},
		onTokenUpdateVerifier: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			if (oEvent.getParameter("type") === "removed") {
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_STAFF_ID", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_ULU", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_FDLU", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME", "");
			}
		},
		_fnAddToken: function (oControl, sKey, sText) {
			oControl.setTokens([new sap.m.Token({
				text: sText,
				key: sKey
			})]);
		},
		handleConfirmApprover1: function (oEvent) {
			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);

			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedAdditionalApprover = this.AppModel.getProperty(sPath);
				var objAdditionalApprover = {
					"STAFF_ID": objSelectedAdditionalApprover.STF_NUMBER,
					"NUSNET_ID": objSelectedAdditionalApprover.NUSNET_ID,
					"ULU": objSelectedAdditionalApprover.ULU_C,
					"FDLU": objSelectedAdditionalApprover.FDLU_C,
					"STAFF_FULL_NAME": objSelectedAdditionalApprover.FULL_NM
				};

				//	to check whether the selected AP1 is not maintained as the verifier or Approver in Approver matrix
				var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
				var aFilter = [];
				var aFinalFilter = [];
				var staffUserGroupFilter = [];
				staffUserGroupFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, 'VERIFIER'));
				staffUserGroupFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, 'APPROVER'));
				aFilter.push(new sap.ui.model.Filter(staffUserGroupFilter, false));
				var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
				var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
				aFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, ulu)); //ULU
				aFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, fdlu)); // FDLU
				aFilter.push(new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, objSelectedAdditionalApprover.STF_NUMBER)); // Staff User Group
				aFinalFilter.push(new sap.ui.model.Filter(aFilter, true));

				// var filtersGrp = new Filter({
				// 	filters: [filterFdluCode, filterStfNumber, filterUluCode],
				// 	and: true
				// });

				EclaimSrvModel.read("/ApproverMatrixs", {
					filters: aFinalFilter,
					success: function (oData) {
						if (oData.results.length > 0) {
							var currentDate = new Date;
							currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
							var validFrom = oData.results[0].VALID_FROM;
							validFrom = Formatter.formatDateAsString(validFrom, "yyyy-MM-dd");
							var validTo = oData.results[0].VALID_TO;
							validTo = Formatter.formatDateAsString(validTo, "yyyy-MM-dd");
							if (currentDate >= validFrom && currentDate <= validTo) {
								//Raise error as selected Additional Approver is not right
								MessageBox.error(
									"Addn approver is maintained as Verifer or Approver in Approver Matrix for ULU/FDLU"
								);
							} else {
								//Add app is allowed
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID", objSelectedAdditionalApprover.STF_NUMBER);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID", objSelectedAdditionalApprover.NUSNET_ID);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_ULU", objSelectedAdditionalApprover.ULU_C);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_FDLU", objSelectedAdditionalApprover.FDLU_C);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME", objSelectedAdditionalApprover.FULL_NM);
								this._fnAddToken(this.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(this,
									"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(this,
									"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
							}
						} else {
							//
							//this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDTIONAL_APPROVER_1", [objAdditionalApprover]);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID", objSelectedAdditionalApprover.STF_NUMBER);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID", objSelectedAdditionalApprover.NUSNET_ID);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_ULU", objSelectedAdditionalApprover.ULU_C);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_FDLU", objSelectedAdditionalApprover.FDLU_C);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME", objSelectedAdditionalApprover.FULL_NM);
							this._fnAddToken(this.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(this,
								"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(this,
								"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
						}

					}.bind(this),
					error: function (oError) {}
				});

			}
		},

		onTokenUpdateAddApp1: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			if (oEvent.getParameter("type") === "removed") {
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_ULU", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_FDLU", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME", "");
				if (Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID")) {

					Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID",
						Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID"));

					Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID",
						Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"));

					Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_ULU",
						Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_ULU"));

					Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_FDLU",
						Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_FDLU"));

					Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME",
						Utility._fnAppModelGetProperty(this, "/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));

					this._fnAddToken(this.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(this,
						"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(this,
						"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
					this.onPressRemoveAdditionalApprover();
				}

			}
		},

		handleConfirmApprover2: function (oEvent) {
			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);

			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedAdditionalApprover = this.AppModel.getProperty(sPath);
				var objAdditionalApprover = {
					"STAFF_ID": objSelectedAdditionalApprover.STF_NUMBER,
					"NUSNET_ID": objSelectedAdditionalApprover.NUSNET_ID,
					"ULU": objSelectedAdditionalApprover.ULU_C,
					"FDLU": objSelectedAdditionalApprover.FDLU_C,
					"STAFF_FULL_NAME": objSelectedAdditionalApprover.FULL_NM
				};

				//	to check whether the selected AP1 is not maintained as the verifier or Approver in Approver matrix
				//	this.AppModel.setProperty("/ErrorApp1ForSameVerOrApp", '');
				var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
				var aFilter = [];
				var aFinalFilter = [];
				var staffUserGroupFilter = [];
				staffUserGroupFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, 'VERIFIER'));
				staffUserGroupFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, 'APPROVER'));
				aFilter.push(new sap.ui.model.Filter(staffUserGroupFilter, false));
				var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
				var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
				aFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, ulu)); //ULU
				aFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, fdlu)); // FDLU
				aFilter.push(new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, objSelectedAdditionalApprover.STF_NUMBER)); // Staff User Group
				aFinalFilter.push(new sap.ui.model.Filter(aFilter, true));

				EclaimSrvModel.read("/ApproverMatrixs", {
					filters: aFinalFilter,
					success: function (oData) {
						if (oData.results.length > 0) {
							var currentDate = new Date;
							currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
							var validFrom = oData.results[0].VALID_FROM;
							validFrom = Formatter.formatDateAsString(validFrom, "yyyy-MM-dd");
							var validTo = oData.results[0].VALID_TO;
							validTo = Formatter.formatDateAsString(validTo, "yyyy-MM-dd");
							if (currentDate >= validFrom && currentDate <= validTo) {
								//Raise error as selected Additional Approver is not right
								MessageBox.error(
									"Addn approver is maintained as Verifer or Approver in Approver Matrix for ULU/FDLU"
								);
							} else {
								//Add app is allowed
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID", objSelectedAdditionalApprover.STF_NUMBER);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID", objSelectedAdditionalApprover.NUSNET_ID);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_ULU", objSelectedAdditionalApprover.ULU_C);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_FDLU", objSelectedAdditionalApprover.FDLU_C);
								this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME",
									objSelectedAdditionalApprover
									.FULL_NM);
								this._fnAddToken(this.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(this,
									"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(this,
									"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
							}
						} else {
							//				this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDTIONAL_APPROVER_2", [objAdditionalApprover]);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID", objSelectedAdditionalApprover.STF_NUMBER);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID", objSelectedAdditionalApprover.NUSNET_ID);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_ULU", objSelectedAdditionalApprover.ULU_C);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_FDLU", objSelectedAdditionalApprover.FDLU_C);
							this.AppModel.setProperty("/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME", objSelectedAdditionalApprover
								.FULL_NM);
							this._fnAddToken(this.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(this,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(this,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
						}

					}.bind(this),
					error: function (oError) {}
				});
			}
		},

		onTokenUpdateAddApp2: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			if (oEvent.getParameter("type") === "removed") {
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_2_STAFF_ID", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_2_NUSNET_ID", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_2_ULU", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_2_FDLU", "");
				Utility._fnAppModelSetProperty(this, "/claimRequest/createClaimRequest/ADD_APP_2_STAFF_FULL_NAME", "");
			}
		},
		onChange: function (oEvent, sParameter) {
			switch (sParameter) {
			case "validateWbsFromDialog":
				ChangeEventHandling._fnValidateWbsFromDialog(oEvent, this);
				break;
			case "changeOfDiscAmt":
				ChangeEventHandling._fnOnChangeofDiscrepancyAmount(oEvent, this);
				break;
			case "validatePreviousWbs":
				ChangeEventHandling._fnValidateSelectedWbsPreviousIsValidOrNot(oEvent, this);
				break;
			}
		},
		handleValueHelp1: function (oEvent, sValue) {

			if (sValue === 'passed') {
				var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", sPath);
			}
			var that = this;
			// create popover
			if (!that._pDialog1) {
				that._pDialog1 = sap.ui.xmlfragment(that.createId("fraTimePickerSliderDialog1"),
					'nus.edu.sg.claimrequest.view.fragments.detaillayout.StartfTimePickerSlidersDialog', that);
				that.getView().addDependent(that._pDialog1);
				//	sap.ui.core.Fragment.byId(this.createId("fraTimePickerSliderDialog1"), "TPS1").setMinutesStep(15);
			}
			this._pDialog1.open();
		},

		handleValueHelp2: function (oEvent, sValue) {

			if (sValue === 'passed') {
				var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", sPath);
			}

			var that = this;
			// create popover
			if (!that._pDialog2) {
				that._pDialog2 = sap.ui.xmlfragment(that.createId("fraTimePickerSliderDialog2"),
					'nus.edu.sg.claimrequest.view.fragments.detaillayout.TimePickerSlidersDialog', that);
				that.getView().addDependent(that._pDialog2);
				//	sap.ui.core.Fragment.byId(this.createId("fraTimePickerSliderDialog2"), "TPS2").setMinutesStep(15);
			}
			this._pDialog2.open();
		},

		handleOKPress1: function () {

			var sPath = this.AppModel.getProperty("/claimRequest/createClaimRequest/sPath");
			var startTime = sap.ui.core.Fragment.byId(this.createId(
				"fraTimePickerSliderDialog1"), "TPS1").getValue();
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			if (sPath) {
				this.AppModel.setProperty(sPath + "/START_TIME", startTime);
				var endTime = this.AppModel.getProperty(sPath + "/END_TIME");
				if (startTime && endTime) {
					//

					var date = this.AppModel.getProperty(sPath + "/CLAIM_START_DATE");
					date = new Date(date);
					var differenceHours = Formatter.calculateHours(startTime, endTime);
					var calcDifferenceHours = differenceHours;
					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/

					// if (claimType === this.getI18n("PTT") && differenceHours >= 8) {
					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					/**** End of Change for Computation Logic *****/

					this.AppModel.setProperty(sPath + "/HOURS_UNIT", calcDifferenceHours);
				}

				var discInRatesCheckBox = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
				if (discInRatesCheckBox) {
					var discrepancyAmount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
					if (calcDifferenceHours && discrepancyAmount) {
						var totalAmount = calcDifferenceHours * discrepancyAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				} else {
					var rateAmount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
					if (calcDifferenceHours && rateAmount) {
						totalAmount = calcDifferenceHours * rateAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				}

				this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", '');

			} else {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/selectedStartTime", startTime);
				var endTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedEndTime");
				if (startTime && endTime) {
					// var hours = Formatter.calculateHours(startTime, endTime);
					// hours = parseFloat(hours).toFixed(2);
					var differenceHours = Formatter.calculateHours(startTime, endTime);
					differenceHours = parseFloat(differenceHours).toFixed(2);
					var calcDifferenceHours = differenceHours;
					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", calcDifferenceHours);
				}
			}
			this._pDialog1.close();
		},

		onChangeofStartTime: function (oEvent) {
			var sPath;
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var regExpHhMm = new RegExp(/^([0-9]|0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$/);
			if (!!oEvent.getSource().getParent().getBindingContext("AppModel")) {
				sPath = oEvent.getSource().getParent().getBindingContext("AppModel").sPath;
			}
			var startTime = oEvent.getParameters().value;
			var hours = startTime.split(":")[0];
			if (hours >= 24) {
				startTime = "00:00";
				oEvent.getSource().setValue(startTime);
				MessageToast.show("Maximum time allowed for a day must be ranges from 00:00 to 23:59");
			}
			// if (startTime && !regExpHhMm.test(startTime)) {
			// 	return MessageBox.error("Please provide correct value for start time in the format HH:mm..!");
			// }
			if (sPath) {
				this.AppModel.setProperty(sPath + "/START_TIME", startTime);
				var endTime = this.AppModel.getProperty(sPath + "/END_TIME");

				if (startTime && endTime) {
					//

					var date = this.AppModel.getProperty(sPath + "/CLAIM_START_DATE");
					date = new Date(date);
					var differenceHours = Formatter.calculateHours(startTime, endTime);
					var calcDifferenceHours = differenceHours;

					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/

					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					/**** End of Change for Computation Logic *****/

					this.AppModel.setProperty(sPath + "/HOURS_UNIT", calcDifferenceHours);
				}

				var discInRatesCheckBox = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
				if (discInRatesCheckBox) {
					var discrepancyAmount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
					if (calcDifferenceHours && discrepancyAmount) {
						var totalAmount = calcDifferenceHours * discrepancyAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				} else {
					var rateAmount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
					if (calcDifferenceHours && rateAmount) {
						totalAmount = calcDifferenceHours * rateAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				}

				this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", '');

			} else {

				var endTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedEndTime");
				if (startTime && endTime) {

					var differenceHours = Formatter.calculateHours(startTime, endTime);
					differenceHours = parseFloat(differenceHours).toFixed(2);
					var calcDifferenceHours = differenceHours;
					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", calcDifferenceHours);
				}
			}
		},

		onChangeofEndTime: function (oEvent) {
			var sPath;
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			if (!!oEvent.getSource().getParent().getBindingContext("AppModel")) {
				sPath = oEvent.getSource().getParent().getBindingContext("AppModel").sPath;
			}
			var endTime = oEvent.getParameters().value;
			var hours = endTime.split(":")[0];
			if (hours >= 24) {
				endTime = "23:59";
				oEvent.getSource().setValue(endTime);
				MessageToast.show("Maximum time allowed for a day must be ranges from 00:00 to 23:59");
			}
			if (sPath) {

				this.AppModel.setProperty(sPath + "/END_TIME", endTime);
				var startTime = this.AppModel.getProperty(sPath + "/START_TIME");
				if (startTime && endTime) {

					var date = this.AppModel.getProperty(sPath + "/CLAIM_START_DATE");
					date = new Date(date);
					var differenceHours = Formatter.calculateHours(startTime, endTime);
					var calcDifferenceHours = differenceHours;

					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/

					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					/**** End of Change for Computation Logic *****/
					this.AppModel.setProperty(sPath + "/HOURS_UNIT", calcDifferenceHours);
				}
				var discInRatesCheckBox = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
				if (discInRatesCheckBox) {
					var discrepancyAmount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
					var totalAmount = calcDifferenceHours * discrepancyAmount;
					totalAmount = parseFloat(totalAmount).toFixed(2);
				} else {
					var rateAmount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
					if (calcDifferenceHours && rateAmount) {
						totalAmount = calcDifferenceHours * rateAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				}

				this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", '');

			} else {

				// var endTime = oEvent.getParameters().value;
				var startTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedStartTime");
				if (startTime && endTime) {

					var differenceHours = Formatter.calculateHours(startTime, endTime);
					differenceHours = parseFloat(differenceHours).toFixed(2);
					var calcDifferenceHours = differenceHours;
					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", calcDifferenceHours);
				}
			}
		},

		onPressIconComment: function (oEvent) {

			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var obj = this.AppModel.getProperty(sPath);
			this.AppModel.setProperty("/itemCommentSelectedPath", sPath);
			var oButton = oEvent.getSource(),
				oView = this.getView();

			if (!this._oCommentPopover) {
				this._oCommentPopover = sap.ui.xmlfragment(oView.getId(),
					"nus.edu.sg.claimrequest.view.fragments.detaillayout.ClaimDatesComment", this);
				oView.addDependent(this._oCommentPopover);
			}
			sap.ui.core.Fragment.byId(oView.getId(), "commentShow").setValue(
				obj.REMARKS);
			this._oCommentPopover.openBy(oButton);
		},
		onSaveCommentItem: function () {
			var sPath = this.AppModel.getProperty("/itemCommentSelectedPath");
			var sRemarks = this.getView().byId("commentShow").getValue();
			this.AppModel.setProperty(sPath + "/REMARKS", sRemarks);
			this.AppModel.setProperty("/itemCommentSelectedPath", null);
			this.onCancelCommentItem();
		},
		onCancelCommentItem: function () {
			this.getView().byId("myPopoverForComment").close();
		},
		handleOKPress2: function (oEvent) {
			var sPath = this.AppModel.getProperty("/claimRequest/createClaimRequest/sPath");
			var endTime = sap.ui.core.Fragment.byId(this.createId(
				"fraTimePickerSliderDialog2"), "TPS2").getValue();
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			var hours = endTime.split(":")[0];
			if (hours >= 24) {
				endTime = "23:59";
				sap.ui.core.Fragment.byId(this.createId(
					"fraTimePickerSliderDialog2"), "TPS2").setValue(endTime);
				// oEvent.getSource().setValue(endTime);
				MessageToast.show("Maximum time allowed for a day must be ranges from 00:00 to 23:59");
			}
			if (sPath) {
				this.AppModel.setProperty(sPath + "/END_TIME", endTime);
				var startTime = this.AppModel.getProperty(sPath + "/START_TIME");
				if (startTime && endTime) {

					var date = this.AppModel.getProperty(sPath + "/CLAIM_START_DATE");
					date = new Date(date);
					//		var differenceHours = Math.abs(date - date) / 36e5;
					var differenceHours = Formatter.calculateHours(startTime, endTime);
					var calcDifferenceHours = differenceHours;
					/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/

					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					/**** End of Change for Computation Logic *****/

					/*	if (date.getDay() >= 1 && date.getDay() <= 4) {
							if (differenceHours >= 8.5) {
								calcDifferenceHours = differenceHours - 1;
							}

						} else if (date.getDay() === 5) {
							if (differenceHours >= 8) {
								calcDifferenceHours = differenceHours - 1;
							}
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);*/
					//	var hours = Formatter.calculateHours(startTime, endTime);
					this.AppModel.setProperty(sPath + "/HOURS_UNIT", calcDifferenceHours);
				}
				var discInRatesCheckBox = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
				if (discInRatesCheckBox) {
					var discrepancyAmount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
					if (calcDifferenceHours && discrepancyAmount) {
						var totalAmount = calcDifferenceHours * discrepancyAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				} else {
					var rateAmount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
					if (calcDifferenceHours && rateAmount) {
						totalAmount = calcDifferenceHours * rateAmount;
						totalAmount = parseFloat(totalAmount).toFixed(2);
					}
				}

				this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
				this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", '');

			} else {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/selectedEndTime", endTime);
				var startTime = this.AppModel.getProperty("/claimRequest/createClaimRequest/selectedStartTime");
				if (startTime && endTime) {
					var differenceHours = Formatter.calculateHours(startTime, endTime);
					differenceHours = parseFloat(differenceHours).toFixed(2);
					var calcDifferenceHours = differenceHours;
					if (differenceHours >= 8) {
						if ((claimType === '102' || claimType === this.getI18n("PTT")) && differenceHours >= 8) {
							calcDifferenceHours = differenceHours - 1;
						}
						calcDifferenceHours = parseFloat(calcDifferenceHours).toFixed(2);
					}
					this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", calcDifferenceHours);
					// var hours = Formatter.calculateHours(startTime, endTime);
					// hours = parseFloat(hours).toFixed(2);
					// this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", hours);
				}
			}
			this._pDialog2.close();
		},
		handleCancelPress1: function () {

			this._pDialog1.close();
		},

		handleCancelPress2: function () {
			this._pDialog2.close();
		},
		onPressOptions: function (oEvent) {
			this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", '');
			var sPath = oEvent.getSource().getParent().getBindingContext("AppModel").sPath;
			this.AppModel.setProperty("/claimRequest/createClaimRequest/sPath", sPath);
			var oButton = oEvent.getSource();
			this.byId("claimActionSheet").openBy(oButton);
		},
		onRowCwAdd: function (oEvent) {
			var sContextPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var oContextPathData = this.AppModel.getProperty(sContextPath);
			var aEclaimsItemDataDetails = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			var copiedClaimItemData = Formatter.assignPropertiesToObjects({}, oContextPathData, true);
			var claimRequestType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");

			//Removing the extra data
			if (claimRequestType !== 'Period') {
				copiedClaimItemData["START_TIME"] = "";
				copiedClaimItemData["END_TIME"] = "";
			}

			copiedClaimItemData["HOURS_COMPUTED"] = "";
			copiedClaimItemData["HOURS_UNIT"] = "";
			copiedClaimItemData["RATE_TYPE"] = "";
			copiedClaimItemData["IS_DISCREPENCY"] = 0;
			copiedClaimItemData["IS_MARK_DELETION"] = 0;
			copiedClaimItemData["IS_MULTIPLE"] = 1;
			copiedClaimItemData["IS_PH"] = 0;
			copiedClaimItemData["ITEM_ID"] = "";
			copiedClaimItemData["RATE_TYPE_AMOUNT"] = "";
			copiedClaimItemData["TOTAL_AMOUNT"] = "";
			copiedClaimItemData["UPDATED_BY"] = "";
			// copiedClaimItemData["WBS"] = "";
			// copiedClaimItemData["WBS_DESC"] = "";
			copiedClaimItemData["UPDATED_ON"] = new Date();
			copiedClaimItemData["DISC_RATETYPE_AMOUNT"] = "";

			aEclaimsItemDataDetails.push(copiedClaimItemData);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aEclaimsItemDataDetails);
			//Begin of logic to allow deletion of the Row if there are more than one rows
			var eclaimsItemDataDetails = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			if (claimRequestType === 'Period' && !!eclaimsItemDataDetails && eclaimsItemDataDetails.length > 1) {
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", true);
			} else if (claimRequestType === 'Period') {
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", false);
			}
			//end of logic to allow deletion of the Row if there are more than one rows
			this.AppModel.refresh(true);
		},
		onRowAdd: function (oEvent) {
			var sContextPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var oContextPathData = this.AppModel.getProperty(sContextPath);
			var aEclaimsItemDataDetails = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			var copiedClaimItemData = Formatter.assignPropertiesToObjects({}, oContextPathData, true);
			var claimRequestType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			//Removing the extra data
			if (claimRequestType !== 'Period') {
				copiedClaimItemData["START_TIME"] = "";
				copiedClaimItemData["END_TIME"] = "";
			}

			if (claimRequestType === 'Period') {
				//Changed the logic as new start date should be the copied one and cannot the first date of the month always
				// var claimStartDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
				// var claimEndDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
				var claimStartDate = copiedClaimItemData.CLAIM_START_DATE;
				var claimEndDate = copiedClaimItemData.CLAIM_END_DATE;
				var selMonthRateTypeNamountList = this.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
				var RateTypeDetails = [];
				var selectedDayListAmountSet = [];
				var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");

				claimStartDate = Formatter.formatDateAsString(claimStartDate, "yyyy-MM-dd");
				claimEndDate = Formatter.formatDateAsString(claimEndDate, "yyyy-MM-dd");
				//handling ratetype dropdown
				//handling ratetype dropdown
				if (selMonthRateTypeNamountList) {
					selMonthRateTypeNamountList.forEach(function (item, index) {
						var prevRateType;
						for (var i = 0; i < item.aAmountListitems.length; i++) {
							var rateTypeListSetItem = {};
							var amountListSetItem = {};
							var startDate = Formatter.formatDateAsString(item.aAmountListitems[i].START_DATE, "yyyy-MM-dd");
							var endDate = Formatter.formatDateAsString(item.aAmountListitems[i].END_DATE, "yyyy-MM-dd");

							if (claimStartDate >= startDate && claimEndDate <= endDate) {
								amountListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
								//		selectedDayListAmountSet.push(amountListSetItem);   //commented as Rate amount should be shown only after rate type selection
								rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
								rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
								//	rateTypeListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
								if (prevRateType != item.RateTypeCode) {
									RateTypeDetails.push(rateTypeListSetItem);
									prevRateType = item.RateTypeCode;
								}
							}
						}
						prevRateType = undefined;
					});
				}

				copiedClaimItemData["RateTypeDetails"] = RateTypeDetails;
				copiedClaimItemData["selectedDayListAmountSet"] = selectedDayListAmountSet;
			}

			copiedClaimItemData["HOURS_COMPUTED"] = "";
			copiedClaimItemData["HOURS_UNIT"] = "";
			copiedClaimItemData["RATE_TYPE"] = "";
			copiedClaimItemData["IS_DISCREPENCY"] = 0;
			copiedClaimItemData["IS_MARK_DELETION"] = 0;
			copiedClaimItemData["IS_MULTIPLE"] = 1;

			if (claimType === '101') {
				copiedClaimItemData["IS_PH"] = 0;
			}

			copiedClaimItemData["ITEM_ID"] = "";
			copiedClaimItemData["RATE_TYPE_AMOUNT"] = "";
			copiedClaimItemData["TOTAL_AMOUNT"] = "";
			copiedClaimItemData["UPDATED_BY"] = "";
			// copiedClaimItemData["WBS"] = "";
			// copiedClaimItemData["WBS_DESC"] = "";
			copiedClaimItemData["UPDATED_ON"] = new Date();
			copiedClaimItemData["DISC_RATETYPE_AMOUNT"] = "";
			copiedClaimItemData["REMARKS"] = "";
			aEclaimsItemDataDetails.push(copiedClaimItemData);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aEclaimsItemDataDetails);
			//Begin of logic to allow deletion of the Row if there are more than one rows
			var eclaimsItemDataDetails = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			if (claimRequestType === 'Period' && !!eclaimsItemDataDetails && eclaimsItemDataDetails.length > 1) {
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", true);
			} else if (claimRequestType === 'Period') {
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", false);
			}
			//end of logic to allow deletion of the Row if there are more than one rows
			this.AppModel.refresh(true);
		},
		onRowDelete: function (oEvent) {
			var sContextPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var sRemoveRecordIndex = sContextPath.split("/claimRequest/createClaimRequest/EclaimsItemDataDetails/")[1];
			var aEclaimsItemDataDetails = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");

			var objContext = this.AppModel.getProperty(sContextPath);
			var count = 0;
			/*if (objContext.RATE_TYPE === '18') {
				aEclaimsItemDataDetails.forEach(item => {
					if (item.CLAIM_START_DATE === objContext.CLAIM_START_DATE) {
						count++;
					}
				});
				if (count <= 1) {
					return MessageBox.error("Minimum 1 record is required for each date!");
				}
			}*/

			aEclaimsItemDataDetails.splice(sRemoveRecordIndex, 1);
			this.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aEclaimsItemDataDetails);
			//Begin of logic to allow deletion of the Row if there are more than one rows
			var claimRequestType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
			var eclaimsItemDataDetails = this.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
			if (claimRequestType === 'Period' && !!eclaimsItemDataDetails && eclaimsItemDataDetails.length > 1) {
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", true);
			} else if (claimRequestType === 'Period') {
				this.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", false);
			}
			//end of logic to allow deletion of the Row if there are more than one rows			
			this.AppModel.refresh(true);
		},
		onPress: function (oEvent) {

		},
		onEditToggleButtonPress: function () {
			var oObjectPage = this.getView().byId("ObjectPageLayout"),
				bCurrentShowFooterState = oObjectPage.getShowFooter();

			oObjectPage.setShowFooter(!bCurrentShowFooterState);
		},

		handleFullScreen: function () {
			this.oRouter.navTo("detail", {
				layout: "MidColumnFullScreen",
				project: this._project
			});
		},

		handleExitFullScreen: function () {
			this.oRouter.navTo("detail", {
				layout: "TwoColumnsBeginExpanded",
				project: this._project
			});

		},

		handleClose: function () {
			var isLocked = this.AppModel.getProperty("/isClaimLocked");
			var isSaveButtonEnabled = this.AppModel.getProperty("/showSaveButton");
			if (isLocked === false && isSaveButtonEnabled === true) {
				//Confirm user to save before closing
				this.confirmPopUpToSaveBeforeClose();
			} else {
				this.onClose();
			}

		},

		confirmPopUpToSaveBeforeClose: function () {
			var that = this;
			this.AppModel.setProperty("/onCloseViewIsSave", '');
			MessageBox.confirm("Do you want to save before exiting?", {
				title: "Confirmation",
				actions: [sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.NO
				],
				emphasizedAction: sap.m.MessageBox.Action.OK,
				onClose: function (oAction) {
					if (oAction === "YES") {
						var saveSource = 'onCloseSaveCall';
						that.onPressSaveDraftRequest(saveSource, null, true);
						that.AppModel.setProperty("/onCloseViewIsSave", 'Y');
						// that.onClose();
					} else {
						that.onClose();
						that.AppModel.setProperty("/onCloseViewIsSave", 'N');
					}
				}
			});
		},

		onClose: function () {

			var AppModel = this.AppModel.getProperty("/");
			//added on 28 March below check to avoid unwanted unlock call
			//		if (AppModel.claimRequest.createClaimRequest.requestLocked === 'Y') {
			ClaimTypeDataHandling._handleLocking(this, this.getI18n("ClaimDetail.UnLock"), AppModel.claimRequest.createClaimRequest.draftId,
				Utility._fnHandleStaffId(this),
				function (oResponse) {
					// var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
					// this.oRouter.navTo("master", {
					// 	layout: sNextLayout
					// }, true);
					// if (this.autoSaveTrigger) {
					// 	this.autoSaveTrigger.setInterval(0);
					// }
				}.bind(this));
			this.runAutoSave = false; //stop auto save	
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
			sap.ui.getCore().byId("backBtn").detachBrowserEvent("click", this._flpBackBtn, this);
			this.oRouter.navTo("master", {
				layout: sNextLayout
			}, true);
			// if (this.autoSaveTrigger) {
			// 	this.autoSaveTrigger.setInterval(0);
			// }
			//		}
		},

		onExit: function () {
			// if (this.autoSaveTrigger) {
			// 	this.autoSaveTrigger.setInterval(0);
			// }
			this.runAutoSave = false; //stop auto save
			//added below condition to ensure for Claim Report no unlocking request goes and
			// and if the call goes for requestor form and inbox then it should be only once
			if ((this.viaRequestorForm || this.viaInbox) && !this.firstTimeUnlockRequest) {
				this._fnRequestLockHandling();
			}
		},
		_fnRequestLockHandling: function () {
			if (!!this.AppModel) {
				//begin of change on 13 March to remove browser event
				sap.ushell.Container.detachLogoutEvent(function (oLogOff) {}.bind(this));
				//end of change on 13 March to remove browser event
				var AppModel = this.AppModel.getProperty("/");

				ClaimTypeDataHandling._handleLocking(this, this.getI18n("ClaimDetail.UnLock"), AppModel.claimRequest.createClaimRequest.draftId,
					Utility._fnHandleStaffId(this),
					function (oData) {
						if (oData.getParameter("success") && (!oData.getSource().getProperty("/").error)) {
							//added on 28 March below check to release lock status in model 		
							this.AppModel.setProperty("/claimRequest/createClaimRequest/requestLocked", '')
						}
						this.oRouter.getRoute("master").detachPatternMatched(this._onProductMatched, this);
						this.oRouter.getRoute("detail").detachPatternMatched(this._onProductMatched, this);
					}.bind(this));
				//		}
			}
		},

		onSelectCheckBoxDiscpInRate: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			if (oEvent.getParameters("selected").selected) {
				this.AppModel.setProperty(sPath + "/RATE_TYPE_AMOUNT", '');
				this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", '');
				this.AppModel.setProperty(sPath + "/IS_DISCREPENCY", true);
			} else {
				this.AppModel.setProperty(sPath + "/DISC_RATETYPE_AMOUNT", '');
				this.AppModel.setProperty(sPath + "/IS_DISCREPENCY", false);
				var selectedRateType = this.AppModel.getProperty(sPath + "/RATE_TYPE");
				var hrsOrUnit = this.AppModel.getProperty(sPath + "/HOURS_UNIT");
				var aAllRateTypes = this.AppModel.getProperty("/claimRequest/createClaimRequest/RateTypeDetails");
				if (aAllRateTypes) {
					for (var i = 0; i < aAllRateTypes.length; i++) {
						if (selectedRateType === aAllRateTypes[i].RateTypeCode) {
							this.AppModel.setProperty(sPath + "/RATE_TYPE_AMOUNT", aAllRateTypes[i].AMOUNT);
							var rateTypeAmount = aAllRateTypes[i].AMOUNT;
							break;
						}
					}
				}
				if (hrsOrUnit && rateTypeAmount) {
					var totalAmount = hrsOrUnit * rateTypeAmount;
					totalAmount = parseFloat(totalAmount).toFixed(2);
					this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
				} else {
					this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", '');
				}
			}

		},
		handleSearchAdditionalApprover2: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var filterNusNetId = new sap.ui.model.Filter("NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluCode = new sap.ui.model.Filter("FDLU_C", sap.ui.model.FilterOperator.Contains, sValue);

			var filterFdluText = new sap.ui.model.Filter("FDLU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFullName = new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSfStfNumber = new sap.ui.model.Filter("SF_STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStfNumber = new sap.ui.model.Filter("STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluCode = new sap.ui.model.Filter("ULU_C", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluText = new sap.ui.model.Filter("ULU_T", sap.ui.model.FilterOperator.Contains, sValue);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterFdluCode, filterFdluText, filterFullName, filterSfStfNumber, filterStfNumber, filterUluCode,
					filterUluText
				],
				and: false
			});

			EclaimSrvModel.read("/EclaimsAddtionalApproverViews", {
				filters: [filtersGrp],
				success: function (oData) {
					//  
					if (oData.results.length) {
						this.AppModel.setProperty("/AdditionalApprover2", oData.results);

					}
				}.bind(this),
				error: function (oError) {

				}
			});
		},
		handleSearchAdditionalApprover1: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var filterNusNetId = new sap.ui.model.Filter("NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluCode = new sap.ui.model.Filter("FDLU_C", sap.ui.model.FilterOperator.Contains, sValue);

			var filterFdluText = new sap.ui.model.Filter("FDLU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFullName = new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSfStfNumber = new sap.ui.model.Filter("SF_STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStfNumber = new sap.ui.model.Filter("STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluCode = new sap.ui.model.Filter("ULU_C", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluText = new sap.ui.model.Filter("ULU_T", sap.ui.model.FilterOperator.Contains, sValue);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterFdluCode, filterFdluText, filterFullName, filterSfStfNumber, filterStfNumber, filterUluCode,
					filterUluText
				],
				and: false
			});

			EclaimSrvModel.read("/EclaimsAddtionalApproverViews", {
				filters: [filtersGrp],
				success: function (oData) {
					//  
					if (oData.results.length) {
						this.AppModel.setProperty("/AdditionalApprover", oData.results);
					}
				}.bind(this),
				error: function (oError) {}
			});
			//
		},

		handleSearchVerifier: function (oEvent) {
			var sValue = oEvent.getParameter("value").toString();
			// var oFilter = new Filter("Name", FilterOperator.Contains, sValue);
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var filterNusNetId = new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluCode = new sap.ui.model.Filter("FDLU", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluText = new sap.ui.model.Filter("FDLU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFullName = new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSfStfNumber = new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.Contains, sValue);
			// var filterStfNumber = new sap.ui.model.Filter("STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluCode = new sap.ui.model.Filter("ULU", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluText = new sap.ui.model.Filter("ULU_T", sap.ui.model.FilterOperator.Contains, sValue);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterFdluCode, filterFdluText, filterFullName, filterSfStfNumber, filterUluCode,
					filterUluText
				],
				and: false
			});

			var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
			var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
			var andFilter = [];
			var aFilter = [];
			// andFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, ['NUS_CHRS_ECLAIMS_VERIFIER']));
			andFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, ['VERIFIER']));
			andFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, ulu));
			andFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, fdlu));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			/*    var userGrpFilter = new Filter({
			        filters: [filtersGrp, new sap.ui.model.Filter("STAFF_USER_GRP", sap.ui.model.FilterOperator.EQ, "NUS_CHRS_ECLAIMS_VERIFIER")],
			        and: true
			    });*/
			var userGrpFilter = new Filter({
				filters: [filtersGrp, new sap.ui.model.Filter(andFilter, true)],
				and: true
			});

			EclaimSrvModel.read("/EclaimsApprovalMatrixViews", {
				filters: [userGrpFilter],
				success: function (oData) {
					if (oData.results.length) {
						this.AppModel.setProperty("/Verifier", oData.results);
					} else {}
				}.bind(this),
				error: function (oError) {}
			});
		},

		onChangeStartDateForPeriodItem: function (oEvent) {

			var startDate = oEvent.getSource().getValue();
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var endDate = this.AppModel.getProperty(sPath + "/CLAIM_END_DATE");
			var claimMonthMinDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
			claimMonthMinDate = Formatter.formatDateAsString(claimMonthMinDate, "yyyy-MM-dd");
			var claimMonthMaxDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
			claimMonthMaxDate = Formatter.formatDateAsString(claimMonthMaxDate, "yyyy-MM-dd");
			if (startDate >= claimMonthMinDate && startDate <= claimMonthMaxDate) // && endDate >= claimMonthMinDate && endDate <=
			//claimMonthMaxDate && endDate) {
			{
				if (startDate && endDate) {
					this.AppModel.setProperty(sPath + "/START_TIME", "00:00");
					this.AppModel.setProperty(sPath + "/END_TIME", "23:59");
				} else {
					this.AppModel.setProperty(sPath + "/START_TIME", " ");
					this.AppModel.setProperty(sPath + "/END_TIME", " ");
				}
				this.handleRateTypeDropDownValuesForPeriodChange(sPath, startDate, endDate);
			} else {
				this.AppModel.setProperty(sPath + "/CLAIM_START_DATE", '');
				//this.AppModel.setProperty(sPath + "/CLAIM_END_DATE", '');
				MessageBox.error("Start date and End date has to within the selected Claim Month");
			}
		},

		handleRateTypeDropDownValuesForPeriodChange: function (sPath, startDate, endDate) {
			//added the logic to handle the Rate Type drop down for selected period
			var rateType = this.AppModel.getProperty(sPath + "/RATE_TYPE");
			var selMonthRateTypeNamountList = this.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
			var selectedDayListAmountSet = [];
			var RateTypeDetails = [];
			if (selMonthRateTypeNamountList) {
				selMonthRateTypeNamountList.forEach(function (item, index) {
					var prevRateType;
					//var prevAmount;
					//	var countOfAmountItems = 0;
					for (var i = 0; i < item.aAmountListitems.length; i++) {
						var rateTypeListSetItem = {};
						var amountListSetItem = {};
						var RateStartDate = Formatter.formatDateAsString(item.aAmountListitems[i].START_DATE, "yyyy-MM-dd");
						var RateEndDate = Formatter.formatDateAsString(item.aAmountListitems[i].END_DATE, "yyyy-MM-dd");

						if (startDate >= RateStartDate && endDate <= RateEndDate) {
							rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
							rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
							//added on 14 dec
							amountListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
							//added on 13 Feb to ensure amount is added in the array if only the same Amount is not previously added 							
							var isAmountNotUnique = '';
							for (var j = 0; j < selectedDayListAmountSet.length; j++) {
								if (selectedDayListAmountSet[j].AMOUNT === item.aAmountListitems[i].AMOUNT) {
									isAmountNotUnique = 'X';
									break;
								}
							}
							if (isAmountNotUnique === '' && item.RateTypeCode === rateType) {
								selectedDayListAmountSet.push(amountListSetItem);
							}
							//
							//rateTypeListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
							if (prevRateType != item.RateTypeCode) {
								RateTypeDetails.push(rateTypeListSetItem);
								prevRateType = item.RateTypeCode;
							}
						}
					}
					prevRateType = undefined;
				});
			}
			this.AppModel.setProperty(sPath + "/RateTypeDetails", RateTypeDetails);
			//added on 14 dec
			this.AppModel.setProperty(sPath + "/selectedDayListAmountSet", selectedDayListAmountSet);
			//
		},

		onChangeEndDateForPeriodItem: function (oEvent) {
			var endDate = oEvent.getSource().getValue();
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var startDate = this.AppModel.getProperty(sPath + "/CLAIM_START_DATE");
			var claimMonthMinDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
			claimMonthMinDate = Formatter.formatDateAsString(claimMonthMinDate, "yyyy-MM-dd");
			var claimMonthMaxDate = this.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
			claimMonthMaxDate = Formatter.formatDateAsString(claimMonthMaxDate, "yyyy-MM-dd");
			if (endDate >= claimMonthMinDate && endDate <= claimMonthMaxDate) {

				if (startDate && endDate) {
					this.AppModel.setProperty(sPath + "/START_TIME", "00:00");
					this.AppModel.setProperty(sPath + "/END_TIME", "23:59");
				} else {
					this.AppModel.setProperty(sPath + "/START_TIME", " ");
					this.AppModel.setProperty(sPath + "/END_TIME", " ");
				}
				this.handleRateTypeDropDownValuesForPeriodChange(sPath, startDate, endDate);
			} else {
				//this.AppModel.setProperty(sPath + "/CLAIM_START_DATE", '');
				this.AppModel.setProperty(sPath + "/CLAIM_END_DATE", '');
				MessageBox.error("Start date and End date has to within the selected Claim Month");
			}
		},

		onChangeOfHrsOrUnitFromCalendar: function (oEvent) {

			var hrsOrUnit = oEvent.getParameter("newValue");
			var rateAmount = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp");
			if (hrsOrUnit && rateAmount) {
				this.AppModel.setProperty("/claimRequest/createClaimRequest/totalAmountFromCalendarPopUp", hrsOrUnit * rateAmount);
			}
		},
		onChangeOfRateTypeFromCalendar: function (oEvent) {

			var selectedRateType = this.AppModel.getProperty("/claimRequest/createClaimRequest/rateType");
			this.AppModel.setProperty("/claimRequest/createClaimRequest/hoursOrUnit", "");
			var claimRequestType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
			var userRole = this.AppModel.getProperty("/userRole");
			if (userRole === 'ESS') {
				claimRequestType = "Daily";
			}
			//var hrsOrUnit = this.AppModel.getProperty("/claimRequest/createClaimRequest/hoursOrUnit");

			var aAllRateTypes = this.AppModel.getProperty("/claimRequest/createClaimRequest/RateTypeDetails");
			if (aAllRateTypes) {
				for (var i = 0; i < aAllRateTypes.length; i++) {
					if (selectedRateType === aAllRateTypes[i].RateTypeCode) {
						if (claimRequestType === "Daily" && selectedRateType === "11") {
							this.AppModel.setProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp", '');
							this.AppModel.setProperty("/claimRequest/createClaimRequest/rateType", '');
							MessageBox.error("Rate type cannot be monthly, for the daily claim type.");
							return;
						}
						this.AppModel.setProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp", aAllRateTypes[i].AMOUNT);

						//	this.AppModel.setProperty("/claimRequest/createClaimRequest/totalAmountFromCalendarPopUp", hrsOrUnit * aAllRateTypes[i].AMOUNT);
						break;
					} else if (selectedRateType === '') {
						this.AppModel.setProperty("/claimRequest/createClaimRequest/rateAmountFromCalendarPopUp", '');
						//	this.AppModel.setProperty("/claimRequest/createClaimRequest/totalAmountFromCalendarPopUp", '');
						break;
					}
				}
			}
		},

		onPressValidateClaim: function (oEvent) {
			this.showBusyIndicator();
			//added on 11 May to reset the auto save tiem interval
			this.lastSuccessRun = new Date();
			//this.aSaveObj = this.getSaveObject(saveOrSubmit);
			var oReturnValidation = validation._fnSubmitValidation(this);
			if (oReturnValidation.hasValidationError) {
				MessageBox.error("Validation failed. Please check Error List for details.");
				this.hideBusyIndicator();
				return;
			} else {
				this.handleValidation();
			}
		},
		handleValidation: function () {
			var saveOrSubmit = 'Submit';
			this.aSaveObj = this.getSaveObject(saveOrSubmit);
			Utility._fnValidateClaim(this, function (oData) {
				if (!oData.getParameter("success")) {
					MessageBox.error(JSON.parse(oData.getParameter("errorobject").responseText).message);
				} else if (oData.getParameter("success")) {
					var oResponse = oData.getSource().getProperty("/");
					if (oResponse.error) {
						if (oResponse.claimDataResponse.eclaimsData[0].ERROR_STATE) {
							this.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", oResponse.claimDataResponse.eclaimsData[
								0].validationResults);
							MessageBox.error(oResponse.message);
						}
					} else {
						MessageToast.show(this.getI18n("ValidationSuccessfulMessage"));
					}
				}
				this.hideBusyIndicator();
			}.bind(this));
		},

		onPressErrorMessages: function (oEvent) {

			var oView = this.getView();
			var oSourceControl = oEvent.getSource();
			if (!this._pMessagePopover) {
				this._pMessagePopover = sap.ui.xmlfragment("fragSingleRequestErrMessPopOver",
					"nus.edu.sg.claimrequest.view.fragments.detaillayout.SingleRequestErrorMessagesPopover", this);
				oView.addDependent(this._pMessagePopover);
			}
			this._pMessagePopover.openBy(oSourceControl);
		},
		handleDeleteAttachment: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			try {
				this.showBusyIndicator();
				var oList = oEvent.getSource(),
					oItem = oEvent.getParameter("listItem"),
					sPath = oItem.getBindingContext("AppModel").getPath();
				var oAttachment = this.AppModel.getProperty(sPath);
				//fetch rate Type and rate Amount 
				var draftId = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
				var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				var oParameter = {
					draftId: draftId,
					attachmentId: oAttachment.ATTCHMNT_ID,
					processCode: claimType
				};

				var oHeaders = Utility._headerToken(this);
				var serviceUrl = Config.dbOperations.deleteAttachment;
				services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					if (oData.getSource().getData().status === "S") {
						this._fnRefreshAttachment();
						this.hideBusyIndicator();
					} else {
						MessageBox.error(his.getI18n("AttachmentFailedToDelete"));
					}

				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}
		},
		handleDownloadPress: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			try {
				// this.showBusyIndicator();
				var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				var oAttachment = this.AppModel.getProperty(sPath);
				//fetch rate Type and rate Amount 
				var draftId = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
				//added role as well
				var role = this.AppModel.getProperty("/userRole");
				if (role === 'ESS') {
					role = 'CLAIMANT';
				} else if (role === 'CA') {
					role = 'CLAIM_ASSISTANT';
				}
				var oParameter = {
					draftId: draftId,
					attachmentId: oAttachment.ATTCHMNT_ID,
					role: role, //added later
					processCode: claimType //added on 29 March 2023
				};

				var oHeaders = Utility._headerToken(this);
				var serviceUrl = Config.dbOperations.fetchAttachment;
				services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					if (oData.getSource().getData().status === "S") {
						this._fnDownloadFile(oData.getSource().getData().attachmentFiles);
						this.hideBusyIndicator();
					} else {
						MessageBox.error(his.getI18n("AttachmentFailedToDelete"));
					}

				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}

		},
		_fnDownloadFile: function (aFiles) {
			if (aFiles.length > 0) {
				var anchDownlaod = document.createElement("a");
				anchDownlaod.href = "data:" + aFiles[0].contentType + ";base64," + aFiles[0].docContent;
				anchDownlaod.download = aFiles[0].docName;
				// anchDownlaod.target = "_blank";
				// window.open(anchDownlaod.href, '_blank');
				anchDownlaod.click();
			} else {
				return MessageBox.error("No files available for download.");
			}

		},
		openAttachment: function (oEvent) {
			//added on 11 May to reset the auto save time interval
			this.lastSuccessRun = new Date();
			try {
				// this.showBusyIndicator();
				var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				var oAttachment = this.AppModel.getProperty(sPath);
				//added role as well
				var role = this.AppModel.getProperty("/userRole");
				if (role === 'ESS') {
					role = 'CLAIMANT';
				} else if (role === 'CA') {
					role = 'CLAIM_ASSISTANT';
				}
				//fetch rate Type and rate Amount 
				var draftId = this.AppModel.getProperty("/claimRequest/createClaimRequest/draftId");
				var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				var oParameter = {
					draftId: draftId,
					attachmentId: oAttachment.ATTCHMNT_ID,
					role: role, //added later
					processCode: claimType //added on 29 March 2023
				};

				var oHeaders = Utility._headerToken(this);
				var serviceUrl = Config.dbOperations.fetchAttachment;
				services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					if (oData.getSource().getData().status === "S") {
						this._fnOpenFile(oData.getSource().getData().attachmentFiles);
						this.hideBusyIndicator();
					} else {
						MessageBox.error(his.getI18n("AttachmentFailedToDelete"));
					}

				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}
		},
		_fnOpenFile: function (aFiles) {

			if (aFiles.length > 0) {
				// var anchDownlaod = document.createElement("a");
				var href = "data:" + aFiles[0].contentType + ";base64," + aFiles[0].docContent;
				const byteCharacters = atob(aFiles[0].docContent);
				const byteArrays = [];

				for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
					const slice = byteCharacters.slice(offset, offset + 1024);

					const byteNumbers = new Array(slice.length);
					for (let i = 0; i < slice.length; i++) {
						byteNumbers[i] = slice.charCodeAt(i);
					}

					const byteArray = new Uint8Array(byteNumbers);

					byteArrays.push(byteArray);
				}
				const blob = new Blob(byteArrays, {
					type: aFiles[0].contentType
				});
				const blobUrl = URL.createObjectURL(blob);

				window.open(blobUrl, '_blank');
				// anchDownlaod.click();
			} else {
				return MessageBox.error("No files available for download.");
			}

		},

		_fnFetchTasksConfigs: function (requestorGroup) {
			this.showBusyIndicator();
			var that = this;
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			var claimType = this.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
			//	var filters = that.generateFilter("REQUESTOR_GRP", requestorGroup);
			var filterRequestorGrp = new sap.ui.model.Filter("REQUESTOR_GRP", sap.ui.model.FilterOperator.EQ, requestorGroup);
			var filterProcessCode = new sap.ui.model.Filter("PROCESS_CODE", sap.ui.model.FilterOperator.EQ, claimType);
			var filtersGrp = new Filter({
				filters: [filterRequestorGrp, filterProcessCode],
				and: true
			});

			EclaimSrvModel.read("/TasksConfigs", {
				filters: [filtersGrp],
				success: function (oData) {
					if (oData.results.length) {
						for (var i = 0; i < oData.results.length; i++) {
							if (oData.results[i].TASK_NAME === 'VERIFIER') {
								that.AppModel.setProperty("/isVerifierMandatory", oData.results[i].IS_MANDATORY);
							}
						}
					}
					that.hideBusyIndicator();
				},
				error: function (oError) {
					that.hideBusyIndicator();
				}
			});
		},

		_fnFetchApproverForCA: function () {
			this.showBusyIndicator();
			var ulu = this.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelectedCode");
			var fdlu = this.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelectedCode");
			var that = this;
			var EclaimSrvModel = this.getComponentModel("EclaimSrvModel");
			//	var filters = that.generateFilter("REQUESTOR_GRP", requestorGroup);
			//var filters = new sap.ui.model.Filter("ULU", sap.ui.model.FilterOperator.EQ, ulu);
			var aFilter = [];
			var aFinalFilter = [];
			aFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, ulu)); //ULU
			aFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, fdlu)); // FDLU
			aFilter.push(new sap.ui.model.Filter("STAFF_USER_GRP", FilterOperator.EQ, 'APPROVER')); // Staff User Group
			//begin of changes on 2 March to ensure only active records are fetched from Approver Matrix
			var currentDate = new Date();
			aFilter.push(new sap.ui.model.Filter("APM_VALID_FROM", FilterOperator.LE, currentDate)); // Valid from 
			aFilter.push(new sap.ui.model.Filter("APM_VALID_TO", FilterOperator.GE, currentDate)); // Valid To
			//end of changes on 2 March to ensure only active records are fetched from Approver Matrix
			aFinalFilter.push(new sap.ui.model.Filter(aFilter, true));

			EclaimSrvModel.read("/ApproverMatrixs", {
				filters: aFinalFilter,
				success: function (oData) {
					if (oData.results.length) {
						that.AppModel.setProperty("/ApproversList", oData.results);
						//	for (var i = 0; i < oData.results.length; i++) {
						//		if (oData.results[i].TASK_NAME === 'VERIFIER') {
						//			that.AppModel.setProperty("/isVerifierMandatory", oData.results[i].IS_MANDATORY);
						//		}
						//	}
					}
					that.hideBusyIndicator();
				},
				error: function (oError) {
					that.hideBusyIndicator();
				}
			});
		},

		settingVisibilityToFalse: function () {

			Utility._fnAppModelSetProperty(this, "/showSaveButton", false);
			Utility._fnAppModelSetProperty(this, "/showSubmitButton", false);
			Utility._fnAppModelSetProperty(this, "/showWithdrawButton", false);
			Utility._fnAppModelSetProperty(this, "/showRetractButton", false);
			Utility._fnAppModelSetProperty(this, "/showCheckButton", false);
			Utility._fnAppModelSetProperty(this, "/showRejectButton", false);
			Utility._fnAppModelSetProperty(this, "/showVerifyButton", false);
			Utility._fnAppModelSetProperty(this, "/showApproveButton", false);
			Utility._fnAppModelSetProperty(this, "/showAdditonalApprover2", false);
			Utility._fnAppModelSetProperty(this, "/showAdditionalApproverLink", false);
			Utility._fnAppModelSetProperty(this, "/showRemoveAdditionalApproverLink", false);
			Utility._fnAppModelSetProperty(this, "/exitFullScreen", false);
			Utility._fnAppModelSetProperty(this, "/closeColumn", false);
			//added attachment upload and delete options as well	
		},
		/*onChangeWBSOverwrite: function (oEvent) {
			var sWBS = this.AppModel.getProperty("/claimRequest/createClaimRequest/wbsOverwrite");
			//check WBS filled is valid or not
			if (sWBS) {
				//call WBS validate API 
				var token = this.AppModel.getProperty("/token");
				var saveObj = {};
				saveObj.WBSRequest = {};
				saveObj.WBSRequest.WBS = [];
				saveObj.WBSRequest.WBS.push(sWBS);
				var oHeaders = {
					"Accept": "application/json",
					"Authorization": "Bearer" + " " + token,
					"AccessPoint": "A",
					"Content-Type": "application/json"
				};
				var url = "/rest/eclaims/ecpwbsvalidate";
				var wbsValidateModel = new JSONModel();
				wbsValidateModel.loadData(url, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
				if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
					this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "Error");
					this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", wbsValidateModel.getData().EtOutput.item
						.EvMsg);
				} else {
					this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueState", "None");
					this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteValueStateText", "");
					this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwrite", wbsValidateModel.getData().EtOutput.item.EvActwbs);
					this.AppModel.setProperty("/claimRequest/createClaimRequest/wbsOverwriteDesc", wbsValidateModel.getData().EtOutput.item.EvWbsdesc);
				}
			}
		}*/
	});
});