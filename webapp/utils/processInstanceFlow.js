sap.ui.define([
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel",
	"./services",
	"./utility",
	"./configuration",
	"./dataformatter"
], function (Filter, FilterOperator, FilterType, Fragment, Sorter, JSONModel, Services, Utility, Config, Formatter) {
	"use strict";
	var processInstanceFlow = ("nus.edu.sg.claimrequest.utils.processInstanceFlow", {
		_onPressProcessInstance: function (oEvent, component) {
			component.showBusyIndicator();
			var sPath = oEvent.getSource().getBindingContext("EclaimSrvModel").getPath();
			var objData = component.getComponentModel("EclaimSrvModel").getProperty(sPath);
			if (!component._oProcessInstanceNode) {
				component._oProcessInstanceNode = sap.ui.xmlfragment(component.createId("fragProcessInstanceNodeTest"),
					"nus.edu.sg.claimrequest.view.fragments.TaskApprovalProcessFlow", component);
				component.getView().addDependent(component._oProcessInstanceNode);
				// sap.ui.core.Fragment.byId(component.createId("fragExistingPromotion"), "tblExistingPromotion").setModel(
				// 	"ExistingPromotionModel");
				component._oProcessInstanceNode.setEscapeHandler(function () {
					return;
				});
			}
			//component.leaveDetails();
			component.AppModel.setProperty("/processFlowRequestID", objData.REQUEST_ID);
			this._fnFrameProcessData(objData,component);
			component._oProcessInstanceNode.open();
		},
		_fnFrameProcessData: function (objData, component) {
			component.AppModel.setProperty("/processFlowRequestID", objData.REQUEST_ID);
			Services.fetchTaskProcessDetails(component, objData, function (oResponse) {
				var taskHistoryList = oResponse.taskHistoryList;
				var aNodes = [];
				var aLanes = [];
				for (var t = 0; t < taskHistoryList.length; t++) {
					var objNodes = {};
					objNodes.id = "N00" + taskHistoryList[t].TASK_POSITION;
					objNodes.lane = ("L00" + taskHistoryList[t].TASK_POSITION).toString();
					objNodes.COMPLETED_BY_FULL_NAME = taskHistoryList[t].TASK_USER_FULLNAME ? taskHistoryList[t].TASK_USER_FULLNAME :
						"";
					if (!objNodes.TASK_ACTUAL_DOC) {
						var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
							pattern: "d MMM, yyyy HH:mm"
						});
						var taskActualCompletionDate = oDateFormat.format(new Date(taskHistoryList[t].TASK_ACTUAL_DOC));
						objNodes.nodeText = objNodes.COMPLETED_BY_FULL_NAME + "(" + taskActualCompletionDate + ")";
						objNodes.taskActualCompletionFormatted = taskActualCompletionDate;
					} else {
						objNodes.nodeText = objNodes.COMPLETED_BY_FULL_NAME;
					}
					objNodes.texts = taskHistoryList[t].TASK_ASSGN_GRP;
					objNodes.focused = false;
					if (taskHistoryList[t].TASK_POSITION === taskHistoryList.length) {
						objNodes.children = [];
					} else {
						objNodes.children = ["N00" + (taskHistoryList[t].TASK_POSITION + 1)];
					}

					var objLanes = {
						"id": objNodes.lane,
						"position": taskHistoryList[t].TASK_POSITION - 1,
						"icon": taskHistoryList[t].TASK_ICON_TYPE ? taskHistoryList[t].TASK_ICON_TYPE : "sap-icon://pending",
						"text": taskHistoryList[t].TASK_NAME ? taskHistoryList[t].TASK_NAME : ""
					};
					objLanes.text = taskHistoryList[t].TASK_ALIAS_NAME;
					/*	switch (taskHistoryList[t].TASK_NAME) {
						case 'CLAIMANT':
							objLanes.text = "Claimant";
							break;
						case 'CLAIM_ASSISTANT':
							objLanes.text = "Claim Assistant";
							break;
						case 'VERIFIER':
							objLanes.text = "Verifier";
							break;
						case 'APPROVER':
							objLanes.text = "Approver";
							break;
						case 'ADD_APP_1':
							objLanes.text = "Additional Approver 1";
							break;
						case 'ADD_APP_2':
							objLanes.text = "Additional Approver 1";
							break;
						default:
							objLanes.text = taskHistoryList[t].TASK_NAME;
						}*/
					if (taskHistoryList[t].TASK_STATUS === "Active") {
						objLanes.state = [{
							"state": "Critical",
							"value": 100
						}];
						objNodes.state = "Critical";
					} else if (taskHistoryList[t].TASK_STATUS === "Completed") {
						if (taskHistoryList[t].ACTION_CODE === 'REJECT') {
							objLanes.state = [{
								"state": "Negative",
								"value": 100
							}];
							objNodes.state = "Negative";
						} else {
							objLanes.state = [{
								"state": "Positive",
								"value": 100
							}];
							objNodes.state = "Positive";
						}

					} else if (taskHistoryList[t].TASK_STATUS === "Rejected") {
						objLanes.state = [{
							"state": "Negative",
							"value": 100
						}];
						objNodes.state = "Negative";
					}
					if (taskHistoryList[t].TASK_NAME === "CLAIMANT") {
						objLanes.state = [{
							"state": "Positive",
							"value": 100
						}];
						objNodes.state = "Positive";
					}

					// fetch image
					if (taskHistoryList[t].TASK_USER_STAFF_ID) {
						var photoResponse = Services.fetchUserImageAsync(component, taskHistoryList[t].TASK_USER_STAFF_ID);
						if (photoResponse && photoResponse.length) {
							objNodes.src = "data:image/png;base64," + photoResponse[0].photo;
						} else {
							objNodes.src = "";
						}
					} else {
						objNodes.src = "";
					}

					aLanes.push(objLanes);
					aNodes.push(objNodes);
					component.AppModel.setProperty("/processNode/nodes", aNodes);
					component.AppModel.setProperty("/processNode/lanes", aLanes);
				}
				component.hideBusyIndicator();
			}.bind(component));
		},
		_onPressCloseProcessNode: function (component) {
			component._oProcessInstanceNode.close();
			component._oProcessInstanceNode.destroy();
			component._oProcessInstanceNode = null;
			component._oProcessInstanceNode = undefined;
		}
	});
	return processInstanceFlow;
}, true);