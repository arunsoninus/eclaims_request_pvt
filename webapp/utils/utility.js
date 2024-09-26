sap.ui.define([
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel",
	"./services",
	"./appconstant",
	"./configuration",
	"./dataformatter",
	"sap/m/Dialog",
	"sap/m/Text"
], function (Filter, FilterOperator, FilterType, Fragment, Sorter, JSONModel, Services, AppConstant, Config, Formatter, Dialog, Text) {
	"use strict";
	var utility = ("nus.edu.sg.claimrequest.utils.utility", {
		_fnAppModelGetProperty: function (component, sPath) {
			return component.AppModel.getProperty(sPath) ? component.AppModel.getProperty(sPath) : "";
		},
		_fnAppModelSetProperty: function (component, sPath, sValue) {
			return component.AppModel.setProperty(sPath, sValue);
		},
		_fnFilterCreation: function (component) {
			component._mFilters = {
				"Draft": [new Filter("REQUEST_STATUS", FilterOperator.EQ, '01')],
				"RejReq": [],
				"Process": [],
				"Post": [],
				"All": []
			};
			var aRejectedList = component.AppModel.getProperty("/statusConfigDetails");
			if (aRejectedList instanceof Array) {
				aRejectedList.forEach(function (oValue) {
					if (oValue.STATUS_ALIAS.indexOf("Reject") !== -1) {
						component._mFilters.RejReq.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}

					if (oValue.STATUS_ALIAS.indexOf("Pending") !== -1 || oValue.STATUS_ALIAS.indexOf("Completed") !== -1 || oValue.STATUS_ALIAS.indexOf(
							"Transferred") !== -1 || oValue.STATUS_ALIAS.indexOf("In Progress") !== -1 || oValue.STATUS_ALIAS.indexOf("Cancelled") !== -1 ||
						oValue.STATUS_ALIAS.indexOf("Suspended") !== -1 || oValue.STATUS_ALIAS.indexOf("Completed") !== -1 || oValue.STATUS_ALIAS.indexOf(
							"Completed") !== -1) {
						component._mFilters.Process.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}
					if (oValue.STATUS_ALIAS.indexOf("Posted") !== -1) {
						component._mFilters.Post.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}

				});

			}
		},
		_assignTokenAndUserInfo: function (oRetData, component) {
			component.AppModel.setProperty("/token", oRetData.token);
			//commented on 19 Feb to avoid the dependency on IAS
			//	component.AppModel.setProperty("/loggedInUserInfo", oRetData.userDetails[0]);
			if (!!oRetData.staffInfo) {
				if (!!oRetData.staffInfo.primaryAssignment) {
					//to ensure wherever NUSTNETID was passed in the app, it will be replaced with Staff ID 					
					component.AppModel.setProperty("/loggedInUserInfo/userName", oRetData.staffInfo.primaryAssignment.STF_NUMBER);
					component.AppModel.setProperty("/loggedInUserStfNumber", oRetData.staffInfo.primaryAssignment.STF_NUMBER);
					sap.ui.getCore().AppContext.STF_NUMBER = oRetData.staffInfo.primaryAssignment.STF_NUMBER;
					component.AppModel.setProperty("/loggedInUserSfStfNumber", oRetData.staffInfo.primaryAssignment.SF_STF_NUMBER);
					//to incorporate primary and secondary assignments(concurrent case ULU and FDLUs)	
					component.AppModel.setProperty("/primaryAssigment", oRetData.staffInfo.primaryAssignment);
				}
				if (!!oRetData.staffInfo.otherAssignments) {
					component.AppModel.setProperty("/otherAssignments", oRetData.staffInfo.otherAssignments);
				}
				if (!!oRetData.staffInfo.claimAuthorizations) {
					component.AppModel.setProperty("/claimAuthorizations", oRetData.staffInfo.claimAuthorizations);
				}
				component.AppModel.setProperty("/staffInfo", oRetData.staffInfo);
				if (!!oRetData.staffInfo.primaryAssignment) {
					var sListUluFdluQuickView = oRetData.staffInfo.primaryAssignment.ULU_T.concat("(", oRetData.staffInfo.primaryAssignment.ULU_C).concat(
						") / ", oRetData.staffInfo.primaryAssignment.FDLU_T).concat("(", oRetData.staffInfo.primaryAssignment.FDLU_C).concat(")", "");
				}
				if (!!oRetData.staffInfo.otherAssignments) {
					for (var t = 0; t < oRetData.staffInfo.otherAssignments.length; t++) {
						var oOtherAssign = oRetData.staffInfo.otherAssignments[t];
						sListUluFdluQuickView = sListUluFdluQuickView.concat("\n\n", oOtherAssign.ULU_T).concat("(", oOtherAssign.ULU_C).concat(") / ",
							oOtherAssign.FDLU_T).concat("(", oOtherAssign.FDLU_C).concat(")", "");
					}
				}
				component.AppModel.setProperty("/sClaimaintListUluFdlu", sListUluFdluQuickView);
			}

			//testing purposes
			var currentURL = window.location.href;

			// String to check for
			var searchString = "webide";

			// Check if the string is contained in the URL
			if (currentURL.includes(searchString)) {
				// var oModel = new sap.ui.model.json.JSONModel();
				// var obj = {
				// 	"role":  "CMASST" // "CMASST"  
				// };
				// oModel.setData(obj);
				// sap.ui.getCore().setModel(oModel, "DashboardParameterModel");
			}

			// end of testing purposes

			//getting the dashboard model
			var oDashboardParameterModel = sap.ui.getCore().getModel("DashboardParameterModel");
			if (!oDashboardParameterModel) {
				this._fnNavToDashboard(component);
			} else {
				var sRole = oDashboardParameterModel.getProperty("/role");
				var sKey = oDashboardParameterModel.getProperty("/key");

				if (sRole === "CLMNT") {
					component.AppModel.setProperty("/userRole", "ESS");
				} else if (sRole === "CMASST") {
					component.AppModel.setProperty("/userRole", "CA");
				} else {
					if (!sRole && !component.viaClaimReport) {
						this._fnNavToDashboard(component);
					}
				}

				var oComponentData = component.getOwnerComponent().getComponentData();
				/*if (oComponentData && oComponentData.startupParameters && oComponentData.startupParameters.role && oComponentData.startupParameters
					.role.length > 0) {
					component._startUpParameterRole = oComponentData.startupParameters.role[0];
				}
				if (oComponentData && oComponentData.startupParameters && oComponentData.startupParameters.key && oComponentData.startupParameters
					.key.length > 0) {
					component._selectedIconTabBarKey = oComponentData.startupParameters.key[0];
				}
				if (component._startUpParameterRole === "CLMNT") {
					component.AppModel.setProperty("/userRole", "ESS");
				} else if (component._startUpParameterRole === "CMASST") {
					component.AppModel.setProperty("/userRole", "CA");
				}*/

				if (sKey) {
					component.AppModel.setProperty("/iconTabBarSelectedKey", sKey);
				}

				if (component.viaInbox === true) {
					component.AppModel.setProperty("/userRole", component.taskName);
					// component.AppModel.setProperty("/userRole", sRole);
				}
				//begin of change to assign role when eclaims app is navigated from Claim Admin Report
				else if (component.viaClaimReport === true) {
					var aClaimAuthorizations = component.AppModel.getProperty("/claimAuthorizations");
					if (aClaimAuthorizations.length) {
						for (var i = 0; i < aClaimAuthorizations.length; i++) {
							if (aClaimAuthorizations[i].STAFF_USER_GRP === 'MATRIX_ADMIN' &&
								aClaimAuthorizations[i].PROCESS_CODE === '100') {
								component.AppModel.setProperty("/userRole", aClaimAuthorizations[i].STAFF_USER_GRP); //Super Admin	
							}
						}
					}
				}
				//end of change				
			}

		},
		_fnNavToDashboard: function (component) {
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: "eclaim_dasbrd",
					action: "Display"
				},
				params: {}
			})) || ""; // generate the Hash to display a Supplier
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			}); // navigate to Supplier application
		},
		_headerToken: function (component) {
			var token = component.AppModel.getProperty("/token");
			sap.ui.getCore().AppContext.TokenSession = token;

			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			return oHeaders;
		},
		_rejStatusCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			if (userRole === 'ESS') {
				aFilter = this._fnEssRejReq(component);
			} else if (userRole === 'CA') {
				aFilter = this._fnCARejReq(component);
			}
			return aFilter;
		},
		_setInProcessCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			if (userRole === 'ESS') {
				aFilter = this._fnEssProcess(component);
			} else if (userRole === 'CA') {
				aFilter = this._fnCAProcess(component);
			}
			return aFilter;
		},
		_setPostedStatusCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];

			if (userRole === 'ESS') {
				aFilter = this._fnEssPost(component);
			} else if (userRole === 'CA') {
				aFilter = this._fnCAPost(component);
			}
			return aFilter;
		},
		_setPendReqStatusCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			if (userRole === 'CA') {
				aFilter = this._fnCAPendReq(component);
			}
			return aFilter;
		},
		_handleIconTabBarSelect: function (component, sKey) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			if (userRole === 'ESS' && sKey === 'RejReq') {
				aFilter = this._fnEssRejReq(component);
			}
			if (userRole === 'CA' && sKey === 'RejReq') {
				aFilter = this._fnCARejReq(component);
			}
			if (userRole === 'ESS' && sKey === 'Process') {
				aFilter = this._fnEssProcess(component);
			}
			if (userRole === 'CA' && sKey === 'Process') {
				aFilter = this._fnCAProcess(component);
			}

			if (userRole === 'ESS' && sKey === 'Post') {
				aFilter = this._fnEssPost(component);
			}
			if (userRole === 'CA' && sKey === 'Post') {
				aFilter = this._fnCAPost(component);
			}

			if (userRole === 'CA' && sKey === 'PendReq') {
				aFilter = this._fnCAPendReq(component);
			}
			return aFilter;
		},
		_fnEssDraft: function (component) {
			//	var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '01'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '15'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			andFilter.push(new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId));
			andFilter.push(new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105'));
			andFilter.push(new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnEssRejReq: function (component) {
			//	var staffId = component.AppModel.getProperty("/loggedInUserId");
			// var staffId = component.AppModel.setProperty("/loggedInUserStfNumber");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var andFilter = [];
			var aFilter = [];
			andFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '07'));
			andFilter.push(new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId));
			//andFilter.push(new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.EQ, staffId));
			andFilter.push(new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105'));
			andFilter.push(new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnEssPost: function (component) {
			// var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '09'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '13'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '14'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			andFilter.push(new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105'));
			andFilter.push(new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId));
			// andFilter.push(new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.EQ, staffId));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnEssProcess: function (component) {
			// var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			//02,03,04,05,06,08
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '02'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '03'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '04'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '05'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '06'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '08'));
			//Added Status 16, 18 and 19 as well
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '16'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '18'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '19'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			andFilter.push(new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId));
			andFilter.push(new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105'));
			// andFilter.push(new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.EQ, staffId));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnCADraft: function (component) {
			var claimAuthorizations = component.AppModel.getProperty("/claimAuthorizations");
			var aFilter = [];
			var orFilter = [];
			//var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			//var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.NE, staffId);
			var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_ID", FilterOperator.NE, staffId);
			
			var requestorGroupFilter = new sap.ui.model.Filter("REQUESTOR_GRP", FilterOperator.EQ, 'CLAIM_ASSISTANT');
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '01'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '17'));
			var oUserBasedFilter = new sap.ui.model.Filter(orFilter, false);
			var oUluFdluMultipleList = this._fnFilterForCAOnUluFdlu(claimAuthorizations);
			aFilter.push(new sap.ui.model.Filter({
				filters: [oUserBasedFilter, oUluFdluMultipleList, caNotClaimantFilter, requestorGroupFilter,new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105')],
				and: true
			}));
			return aFilter;
		},
		_fnCARejReq: function (component) {

			var claimAuthorizations = component.AppModel.getProperty("/claimAuthorizations");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			//	var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			//	var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.NE, staffId);
			var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_ID", FilterOperator.NE, staffId);
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '08'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '18'));
			var oRejectFilter = new sap.ui.model.Filter(orFilter, false);
			//rejected for claim assistant which was submitted by claim assistant
			// andFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '08'));
			// andFilter.push(new sap.ui.model.Filter("SUBMITTED_BY_NID", FilterOperator.EQ, staffId));

			//if verifier or approver reject the claim, then CA will see in the rej request tab
			//var oRejectFilter = new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '08');
			/*var oUserBasedFilter = new Filter({
				filters: andFilter,
				and: true
			});*/
			//list of all ULU and FDLU assigned to CA in Approval matrix
			var oUluFdluMultipleList = this._fnFilterForCAOnUluFdlu(claimAuthorizations);
			aFilter.push(new sap.ui.model.Filter({
				filters: [oRejectFilter, oUluFdluMultipleList, caNotClaimantFilter,new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105')],
				and: true
			}));
			return aFilter;
		},
		_fnCAProcess: function (component) {
			var claimAuthorizations = component.AppModel.getProperty("/claimAuthorizations");
			var aFilter = [];
			var orFilter = [];
			//	var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			// var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.NE, staffId);
			var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_ID", FilterOperator.NE, staffId);
			//'03,04,05,06,07
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '03'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '04'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '05'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '06'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '07'));
			var oUserBasedFilter = new sap.ui.model.Filter(orFilter, false);
			var oUluFdluMultipleList = this._fnFilterForCAOnUluFdlu(claimAuthorizations);
			aFilter.push(new sap.ui.model.Filter({
				filters: [oUserBasedFilter, oUluFdluMultipleList, caNotClaimantFilter,new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105')],
				and: true
			}));
			return aFilter;
		},
		_fnCAPost: function (component) {
			var claimAuthorizations = component.AppModel.getProperty("/claimAuthorizations");
			//	var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			// var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.NE, staffId);
			var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_ID", FilterOperator.NE, staffId);
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '09'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '13'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '14'));
			var oUserBasedFilter = new sap.ui.model.Filter(orFilter, false);
			var oUluFdluMultipleList = this._fnFilterForCAOnUluFdlu(claimAuthorizations);
			aFilter.push(new sap.ui.model.Filter({
				filters: [oUserBasedFilter, oUluFdluMultipleList, caNotClaimantFilter,new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105')],
				and: true
			}));
			return aFilter;
		},
		_fnCAPendReq: function (component) {
			var claimAuthorizations = component.AppModel.getProperty("/claimAuthorizations");
			//	var staffId = component.AppModel.getProperty("/loggedInUserId");
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			//	var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_NUSNET_ID", FilterOperator.NE, staffId);
			var caNotClaimantFilter = new sap.ui.model.Filter("STAFF_ID", FilterOperator.NE, staffId);
			var andFilter = [];
			var aFilter = [];
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			//02,03,04,05,06,08
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '02'));
			// orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '08'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '16'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '18'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '19'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			andFilter.push(new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.NE, staffId));
			andFilter.push(new sap.ui.model.Filter("CLAIM_TYPE", FilterOperator.NE, '105'));
			var oUserBasedFilter = new Filter({
				filters: andFilter,
				and: true
			});

			var oUluFdluMultipleList = this._fnFilterForCAOnUluFdlu(claimAuthorizations);
			aFilter.push(new sap.ui.model.Filter({
				filters: [oUserBasedFilter, oUluFdluMultipleList, caNotClaimantFilter],
				and: true
			}));
			return aFilter;
		},
		_fnFilterForCAOnUluFdlu: function (claimAuthorizations) {
			var aUluFdluFilter = [];
			var aFinalUluFdluFilter = [];
			for (var i = 0; i < claimAuthorizations.length; i++) {
				if (claimAuthorizations[i].STAFF_USER_GRP === "CLAIM_ASSISTANT") { //added to ensure only ULU and FDLU of CA group should be considered
					aUluFdluFilter = [];
					aUluFdluFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, claimAuthorizations[i].ULU_C)); //testing ULU
					aUluFdluFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, claimAuthorizations[i].FDLU_C)); //testing FDLU
					aFinalUluFdluFilter.push(new sap.ui.model.Filter(aUluFdluFilter, true));
				}
			}
			var oUluFdluMultipleList = new Filter({
				filters: aFinalUluFdluFilter,
				and: false
			});
			return oUluFdluMultipleList;
		},
		_generateFilter: function (sValueToFilter, aFilterValues, sOperator) {
			sOperator = sOperator || sap.ui.model.FilterOperator.EQ;
			var aFilterArray = aFilterValues.map(function (sFilterValue) {
				return new sap.ui.model.Filter(sValueToFilter, sOperator, sFilterValue);
			});
			return aFilterArray;
		},
		_bindItems: function (component, controlId, sPath, oSorter, oTemplate, aFilter) {
			var oControl = component.getUIControl(controlId);
			oControl.bindItems({
				path: sPath,
				sorter: oSorter,
				template: oTemplate,
				filters: aFilter //filters //oFilter//filters
			});
		},
		_handleOpenFragment: function (component, fragmentName, fragId, sDialogTab) {
			component._oDialog = null;
			component._oDialog = undefined;
			/*	if (!component._oDialog) {
					component._oDialog = Fragment.load({
						id: fragId,
						name: fragmentName,
						controller: component
					}).then(function (oDialog) {
						// connect dialog to the root view of component component (models, lifecycle)
						component.getView().addDependent(oDialog);
						oDialog.addStyleClass(component.getOwnerComponent().getContentDensityClass());
						return oDialog;
					}.bind(component));
				}
				component._oDialog.then(function (oDialog) {
					if (sDialogTab) {
						oDialog.open(sDialogTab);
					} else {
						oDialog.open();
					}
				});*/

			if (!component._oDialog) {
				component._oDialog = sap.ui.xmlfragment(fragId,
					fragmentName, component);
				component.getView().addDependent(component._oDialog);
				//	sap.ui.core.Fragment.byId(this.createId("fraTimePickerSliderDialog1"), "TPS1").setMinutesStep(15);
			}
			if (sDialogTab) {
				component._oDialog.open(sDialogTab);
			} else {
				component._oDialog.open();
			}

		},
		_handleCloseOpenedFragment: function (component) {
			// component._oDialog.close();
			component._oDialog.destroy();
			component._oDialog = null;
			component._oDialog = undefined;
		},
		/*_handleOpenFragment: function (component, _pViewSettingsDialog, fragmentName, fragId, sDialogTab) {
			if (!component._pViewSettingsDialog) {
				component._pViewSettingsDialog = Fragment.load({
					id: fragId,
					name: fragmentName,
					controller: component
				}).then(function (oDialog) {
					// connect dialog to the root view of component component (models, lifecycle)
					component.getView().addDependent(oDialog);
					oDialog.addStyleClass(component.getOwnerComponent().getContentDensityClass());
					return oDialog;
				}.bind(component));
			}
			component._pViewSettingsDialog.then(function (oDialog) {
				oDialog.open(sDialogTab);
			});
		},*/
		_handleOpenPopOver: function (oEvent, component, _pQuickView, fragmentName, fragId) {
			var oButton = oEvent.getSource(),
				oView = component.getView();

			if (!component._pQuickView) {
				component._pQuickView = Fragment.load({
					id: fragId,
					name: fragmentName,
					controller: component
				}).then(function (oQuickView) {
					oView.addDependent(oQuickView);
					return oQuickView;
				});
			}
			component._pQuickView.then(function (oQuickView) {
				oQuickView.openBy(oButton);
			});
		},
		_filterSortingRequestTable: function (component, oTable, sValue, oSelectedSort, sortingMethod, oSelectedGroup, groupMethod) {
			var filterNusNetId = new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluCode = new sap.ui.model.Filter("FDLU", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluText = new sap.ui.model.Filter("FDLU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFullName = new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSfStfNumber = new sap.ui.model.Filter("SF_STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStfNumber = new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluCode = new sap.ui.model.Filter("ULU", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluText = new sap.ui.model.Filter("ULU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterClaimMonth = new sap.ui.model.Filter("CLAIM_MONTH", sap.ui.model.FilterOperator.Contains, sValue);
			var filterClaimYear = new sap.ui.model.Filter("CLAIM_YEAR", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSubmittedByNid = new sap.ui.model.Filter("SUBMITTED_BY_NID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterClaimTypeText = new sap.ui.model.Filter("CLAIM_TYPE_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterRequestId = new sap.ui.model.Filter("REQUEST_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStatusAlias = new sap.ui.model.Filter("STATUS_ALIAS", sap.ui.model.FilterOperator.Contains, sValue);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterFdluCode, filterFdluText, filterFullName,
					filterSfStfNumber, filterStfNumber, filterUluCode,
					filterUluText, filterClaimMonth, filterClaimYear, filterSubmittedByNid, filterClaimTypeText, filterRequestId,
					filterStatusAlias
				],
				and: false
			});
			var globalFiltersGrp = new Filter({
				filters: component.GlobalFilterForTable,
				and: false
			});

			var finalFilterGrp = new Filter({
				filters: [globalFiltersGrp, filtersGrp],
				and: true
			});
			var oBinding = oTable.getBinding("items");
			//handling filter mechanism
			oBinding.filter([finalFilterGrp], FilterType.Application); //apply the filter

			var aSorter = [];
			//handle grouping mechanism
			if (oSelectedGroup) {
				var groupColumn = oSelectedGroup.getProperty("key");
				aSorter.push(new Sorter({
					path: groupColumn,
					group: true,
					descending: groupMethod
				}));
			}

			//handling sorting mechanism
			var sortingColumn = oSelectedSort.getProperty("key");
			switch (sortingColumn) {
			case "Period":
				aSorter.push(new Sorter({
					path: "CLAIM_YEAR",
					descending: sortingMethod
				}));
				aSorter.push(new Sorter({
					path: "CLAIM_MONTH",
					descending: sortingMethod
				}));
				break;
			default:
				aSorter.push(new Sorter({
					path: sortingColumn,
					descending: sortingMethod
				}));
				break;
			}
			oBinding.sort(aSorter);
		},
		_fnOpenQuickViewForCA: function (component, serviceUrl) {
			component.AppModel.setProperty("/employeeInformation/pageId", component.AppModel.getProperty("/loggedInUserStfNumber"));
			component.AppModel.setProperty("/employeeInformation/FULL_NM", component.AppModel.getProperty("/staffInfo/FULL_NM"));
			component.AppModel.setProperty("/employeeInformation/WORK_TITLE", "Claim Assistant (E-Claims)");
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, null, "GET", oHeaders, function (oData) {
				component.AppModel.setProperty("/employeeInformation/groups", [oData.getSource().getData()]);
			}.bind(component));
		},
		_fnOpenQuickViewForClaimant: function (component, serviceUrl, oDataModel) {
			var aFilter = [];
			aFilter.push(new Filter("NUSNET_ID", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserId").toString()));
			aFilter.push(new Filter("STF_NUMBER", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserStfNumber")));
			aFilter.push(new Filter("SF_STF_NUMBER", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserStfNumber")));
			var filters = new Filter({
				filters: aFilter,
				and: true
			});
			Services._readDataUsingOdataModel(serviceUrl, oDataModel, component, [filters], function (oData) {
				if (oData.results.length) {
					var isEntered = false;
					var sUluFdlu = "";
					for (var t = 0; t < oData.results.length; t++) {

						var objAssign = oData.results[t];
						if (new Date() >= new Date(objAssign.START_DATE) && new Date() <= new Date(objAssign.END_DATE)) {
							component.AppModel.setProperty("/employeeInformation/pageId", objAssign.STF_NUMBER);
							component.AppModel.setProperty("/employeeInformation/FULL_NM", objAssign.FULL_NM);
							component.AppModel.setProperty("/employeeInformation/WORK_TITLE", objAssign.WORK_TITLE);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/0/value", objAssign.COMPANY_T);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/2/value", objAssign.JOB_GRD_T + "(" + objAssign.JOB_GRD_C +
								")");
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/3/value", objAssign.EMAIL);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/4/value", objAssign.EMP_CAT_T);

							if (isEntered) {
								sUluFdlu = sUluFdlu.concat("\n\n", objAssign.ULU_T).concat("(", objAssign.ULU_C).concat(") / ",
									objAssign.FDLU_T).concat("(", objAssign.FDLU_C).concat(")", "")
							} else {
								sUluFdlu = sUluFdlu.concat("", objAssign.ULU_T).concat("(", objAssign.ULU_C).concat(") / ",
									objAssign.FDLU_T).concat("(", objAssign.FDLU_C).concat(")", "")
							}
							isEntered = true;
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/1/value", sUluFdlu);
						}
					}

					//	that.AppModel.setProperty("/employeeInformation/groups/0/elements/6/value", oData.results[0].EMP_GP_T);
				}
			}.bind(component));

		},
		_fnHandleStaffId: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			//	if (userRole === "ESS") {
			//	return component.AppModel.getProperty("/loggedInUserId");
			// sap.ui.getCore().AppContext.NUSNET_ID = component.AppModel.getProperty("/loggedInUserStfNumber");
			return component.AppModel.getProperty("/loggedInUserStfNumber");
			//	}
			//	if (userRole === "CA") {
			// return component.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
			//		return component.AppModel.getProperty("/loggedInUserId");
			//	} else {
			//		return component.AppModel.getProperty("/loggedInUserId");
			//	}

		},
		/*idleLogout: function (component) {
			var t;
			window.onload = resetTimer;
			window.onmousemove = resetTimer;
			// window.onmousedown = resetTimer; // catches touchscreen presses as well      
			// window.ontouchstart = resetTimer; // catches touchscreen swipes as well      
			// window.ontouchmove = resetTimer; // required by some devices 
			window.onclick = resetTimer; // catches touchpad clicks as well
			window.onkeydown = resetTimer;
			window.addEventListener('scroll',resetTimer , true); // improved; see comments

			function resetTimer() {
				
				clearTimeout(t);
				t = setTimeout(component._handleLogOut(), 30000); // time is in milliseconds
			}
		}*/
		handlingSession: function (component) {
			this.setIdleTimeout(15000, function () {}, function () {});
		},
		_fnSortingEclaimItemData: function (claimItems) {
			claimItems.sort(
				(objA, objB) => Number(new Date(objA.CLAIM_START_DATE)) - Number(new Date(objB.CLAIM_START_DATE)),
			);
			return claimItems;
		},

		setIdleTimeout: function (millis, onIdle, onUnidle) {
			var timeout = 0;
			startTimer();

			function startTimer() {
				timeout = setTimeout(onExpires, millis);
				document.addEventListener("mousemove", onActivity);
				document.addEventListener("keydown", onActivity);
				document.addEventListener("touchstart", onActivity);
			}

			function onExpires() {
				timeout = 0;
				onIdle();
			}

			function onActivity() {
				if (timeout) clearTimeout(timeout);
				else onUnidle();
				//since the mouse is moving, we turn off our event hooks for 1 second
				document.removeEventListener("mousemove", onActivity);
				document.removeEventListener("keydown", onActivity);
				document.removeEventListener("touchstart", onActivity);
				setTimeout(startTimer, 1000);
			}
		},
		_clearModelBeforeNavigationToClaimDetailView: function (component) {
			component.AppModel.setProperty("/claimRequest/createClaimRequest", AppConstant.claimRequest.createClaimRequest); //to clear before navigating to the next screens
			component.AppModel.setProperty("/claimRequest/selectedDates", AppConstant.claimRequest.selectedDates); //to clear before navigating to the next screens
			component.AppModel.setProperty("/claimRequest/disabledDates", AppConstant.claimRequest.disabledDates); //to clear before navigating to the next screens
			component.AppModel.setProperty("/enable/ClaimDetailView", AppConstant.enable.ClaimDetailView); //to clear before navigating to the next screens
			component.AppModel.setProperty("/visibility/ClaimDetailView", AppConstant.visibility.ClaimDetailView); //to clear before navigating to the next screens
		},
		_fnOnChangeofWbs: function (wbs, component) {
			if (wbs) {
				var wbsSet = [];
				var wbsSetItem = {};
				var saveObj = {};
				wbsSetItem.WBS = wbs;
				wbsSet.push(wbsSetItem);
				saveObj.WBSRequest = wbsSet;
				var oHeaders = this._headerToken(component);
				var serviceUrl = Config.dbOperations.checkWbs
				var wbsValidateModel = new sap.ui.model.json.JSONModel();
				wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
				var wbsDetails = !wbsValidateModel.getData().EtOutput ? '' : wbsValidateModel.getData().EtOutput;
				return wbsDetails;
			}
			return false;
		},
		_fnSubmitClaim: function (component, callBackFx) {
			var serviceUrl = Config.dbOperations.postClaim;
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, component.aSaveObj, "POST", oHeaders, function (oData) {
				callBackFx(oData);
			}.bind(this));
		},
		_fnValidateClaim: function (component, callBackFx) {
			var serviceUrl = Config.dbOperations.validateClaim;
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, component.aSaveObj, "POST", oHeaders, function (oData) {
				callBackFx(oData);
			}.bind(this));
		},
		_fnCalculateTimeDifference: function (item) {
			var claimStartDate = new Date(item.CLAIM_START_DATE);
			var arrStartTime = item.START_TIME.split(":");
			claimStartDate.setHours(parseInt(arrStartTime[0]));
			if (arrStartTime.length === 2) {
				claimStartDate.setMinutes(parseInt(arrStartTime[1]));
			} else {
				claimStartDate.setMinutes(0);
			}
			//handling end time
			var claimEndDate = new Date(item.CLAIM_END_DATE);
			var arrEndTime = item.END_TIME.split(":");
			claimEndDate.setHours(parseInt(arrEndTime[0]));
			if (claimEndDate.length === 2) {
				claimEndDate.setMinutes(parseInt(arrEndTime[1]));
			} else {
				claimEndDate.setMinutes(0);
			}

			//calculate hours between two dates
			var differenceHours = Math.abs(claimEndDate - claimStartDate) / 36e5;
			var calcDifferenceHours = differenceHours;
			if (claimStartDate.getDay() >= 1 && claimStartDate.getDay() <= 4) {
				if (differenceHours >= 8.5) {
					calcDifferenceHours = differenceHours - 1;
				}

			} else if (claimStartDate.getDay() === 5) {
				if (differenceHours >= 8) {
					calcDifferenceHours = differenceHours - 1;
				}
			}

			if (calcDifferenceHours < parseFloat(item.HOURS_UNIT)) {
				item.HOURS_UNIT = calcDifferenceHours;
			}
		},
		_fnCrossAppNavigationToInbox: function () {
			//setting parameter model for cross app navigation
			var oDashboardParameterModel = sap.ui.getCore().getModel("DashboardParameterModel")

			if (!oDashboardParameterModel) {
				var oModel = new sap.ui.model.json.JSONModel();
				var obj = {
					"role": "cross",
				};
				oModel.setData(obj);
				sap.ui.getCore().setModel(oModel, "DashboardParameterModel");
			} else {
				oDashboardParameterModel.setProperty("/role", "cross");
			}
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: "inbox",
					action: "Display"
				},
				params: {}
			})) || ""; // generate the Hash to display a Supplier
			// hash = hash + "&/taskdetail/" + project + "/" + objData.TASK_INST_ID + "/" + layout;
			// hash = hash + "?navTo=cross"
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			}); // navigate to Supplier application
		},
		_fnSuccessDialog: function (component, sText, callBackFx) {
			if (!component.oSucessDialog) {
				component.oSucessDialog = new Dialog({
					type: "Message",
					title: "Success",
					state: "Success",
					titleAlignment: "Center",
					content: new Text({
						text: sText
					}),
					beginButton: new sap.m.Button({
						type: "Emphasized",
						text: "Ok",
						press: function () {
							component.oSucessDialog.close();
							component.oSucessDialog.destroy();
							component.oSucessDialog = null;
							component.oSucessDialog = undefined;
							return callBackFx();
						}.bind(this)
					})
				});
			}
			component.oSucessDialog.setEscapeHandler(function () {
				return;
			});
			component.oSucessDialog.open();
		},
		_fnGetWbs: function (component) {
			//fetch rate Type and rate Amount
			var stfNumber = component.AppModel.getProperty("/claimRequest/createClaimRequest/STF_NUMBER");
			var selectedDate = component.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
			var oParameter = {
				staffId: stfNumber,
				claimDate: Formatter.formatDateAsString(selectedDate, "yyyy-MM-dd")
			};
			var that = this;
			var oHeaders = this._headerToken(component);
			var serviceUrl = Config.dbOperations.fetchWbs;
			Services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				component.AppModel.setProperty("/claimRequest/WbsDetail", oData.getSource().getData());
				that._fnGetWbsDesc(component, oData.getSource().getData(), that);
			}.bind(component));
		},

		_fnGetWbsDesc: function (component, aData, that) {
			//call WBS validate API 
			var oHeaders = that._headerToken(component);
			var wbsSet = [];
			var wbsSetItem = {};
			wbsSetItem.WBS = [];
			for (var t = 0; t < aData.length; t++) {

				wbsSetItem.WBS.push(aData[t].WBS);
			}

			var saveObj = {};
			saveObj.WBSRequest = wbsSetItem;
			var serviceUrl = Config.dbOperations.checkWbs;
			var wbsValidateModel = new sap.ui.model.json.JSONModel();
			wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
			var wbsData = wbsValidateModel.getData().EtOutput.item;
			var aWbsData = [];
			if (!Array.isArray(wbsData)) {
				aWbsData.push(wbsData);
			} else {
				aWbsData = wbsData;
			}
			var aResponseWBS = [];
			for (var l = 0; l < aWbsData.length; l++) {
				var oItem = {};
				oItem.WBS = aWbsData[l].EvWbs;
				oItem.WBS_DESC = aWbsData[l].EvWbsdesc;
				aResponseWBS.push(oItem);
			}
			component.AppModel.setProperty("/claimRequest/WbsDetail", aResponseWBS);
			/*if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
			} else {
			}*/
		},

		_fnGetBankNCostDisDetails: function (component) {
			var staff_id;
			var userRole = component.AppModel.getProperty("/userRole");
			if (userRole === "ESS") {
				//	staff_id = component.AppModel.getProperty("/loggedInUserId");
				staff_id = component.AppModel.getProperty("/loggedInUserStfNumber");
			}
			//if (userRole === "CA") {
			else {
				//saveObj.STAFF_NUSNET_ID = this.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
				//	staff_id = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimantNusNetId");
				staff_id = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimantStaffId");
			}

			//fetch rate Type and rate Amount 
			//var stfNumber = component.AppModel.getProperty("/loggedInUserStfNumber");
			var oParameter = {
				username: staff_id
			};

			var oHeaders = this._headerToken(component);
			var serviceUrl = Config.dbOperations.claimantStaffInfo;

			Services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				component.AppModel.setProperty("/claimRequest/BankNCostDisDetails", oData.getSource().getData());
				if (!!oData.getSource().getData() && !!oData.getSource().getData().staffInfo) {
					component.AppModel.setProperty("/claimRequest/bankInfoFlag",
						oData.getSource().getData().staffInfo.BANK_INFO_FLG);
					component.AppModel.setProperty("/claimRequest/costDistFlag",
						oData.getSource().getData().staffInfo.COST_DIST_FLG);
				}
			}.bind(component));
		},
		checkForLastRun: function (lastSuccessRun) {
			var currentDate = new Date();
			lastSuccessRun = (lastSuccessRun) ? lastSuccessRun : new Date();
			var isOk = false;
			if (lastSuccessRun) {
				var seconds = (currentDate.getTime() - lastSuccessRun.getTime()) / 1000;
				isOk = (seconds >= 300);
			}
			return isOk;

		}
	});
	return utility;
}, true);