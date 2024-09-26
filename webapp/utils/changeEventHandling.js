sap.ui.define([
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel",
	"./services",
	"./utility"
], function (Filter, FilterOperator, FilterType, Fragment, Sorter, JSONModel, Services, Utility) {
	"use strict";
	var changeEventHandling = ("nus.edu.sg.claimrequest.utils.changeEventHandling", {
		_fnValidateWbsFromDialog: function (oEvent, component) {
			var sWbs = oEvent.getSource().getValue();
			if (sWbs) {
				var wbsDetails = Utility._fnOnChangeofWbs(sWbs, component);
				if (wbsDetails.item.EvStatus === "E") {
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "Error");
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs", wbsDetails.item.EvMsg);
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsElementCode", wbsDetails.item.EvWbs);
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsDesc", wbsDetails.item.EvActwbs);
				} else {
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "None");
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs", "");
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsElementCode", wbsDetails.item.EvActwbs);
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsDesc", wbsDetails.item.EvWbsdesc);
				}
			}
		},
		_fnValidateSelectedWbsPreviousIsValidOrNot: function(oEvent, component){
			var sWbs = oEvent.getSource().getSelectedKey();
			if (sWbs) {
				var wbsDetails = Utility._fnOnChangeofWbs(sWbs, component);
				if (wbsDetails.item.EvStatus === "E") {
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "Error");
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs", wbsDetails.item.EvMsg);
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsElementCode", wbsDetails.item.EvWbs);
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsDesc", wbsDetails.item.EvActwbs);
				} else {
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "None");
					Utility._fnAppModelSetProperty(component, "/errorMessages/valueStateText/SelectPlanningDateFromCalendar/wbs", "");
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsElementCode", wbsDetails.item.EvActwbs);
					Utility._fnAppModelSetProperty(component, "/claimRequest/createClaimRequest/wbsDesc", wbsDetails.item.EvWbsdesc);
				}
			}
		},
		_fnOnChangeofDiscrepancyAmount: function (oEvent, component) {
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var discrepancyAmount = oEvent.getSource().getValue();
			var hrsOrUnit = Utility._fnAppModelGetProperty(component, sPath + "/HOURS_UNIT");
			var totalAmount = hrsOrUnit * discrepancyAmount;
			Utility._fnAppModelSetProperty(component, sPath + "/TOTAL_AMOUNT", totalAmount);
		}
	});
	return changeEventHandling;
}, true);