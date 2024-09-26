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
		var claimTypeDataHandling = ("nus.edu.sg.claimrequest.utils.claimTypeDataHandling", {
			_settingClaimTypeValue: function (component) {
				var oHeaders = Utility._headerToken(component);
				var that = this;
				//	var staffId = component.AppModel.getProperty("/loggedInUserId");
				var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
				var userRole = component.AppModel.getProperty("/userRole");
				if (userRole === "CA") {
					// var userGroup = "NUS_CHRS_ECLAIMS_CA"; //claim assistant
					var userGroup = "CLAIM_ASSISTANT"; //claim assistant
				} else if (userRole === "ESS") {
					userGroup = "NUS_CHRS_ECLAIMS_ESS"; // employee 
				}

				var serviceUrl = Config.dbOperations.fetchClaimType + staffId + "&userGroup=" + userRole + "_MONTH";

				Services._loadDataUsingJsonModel(serviceUrl, null, "GET", oHeaders, function (oData) {
					// var aClaimTypeList = oData.getSource().getData();

					var aClaimTypeList = []
					var aResData = oData.getSource().getData();
					var notAllowedClaims = ["105"];
					for (var z = 0; z < aResData.length; z++) {
						if (notAllowedClaims.indexOf(aResData[z].CLAIM_TYPE_C) === -1) {
							aClaimTypeList.push(aResData[z]);
						}
					}

					// Create a map to store the entries for each unique combination
					const resultMap = new Map();

					// Iterate over the payload
					aClaimTypeList.forEach(entry => {
						// Create a key by joining values of fields other than START_DATE, END_DATE, and SUBMISSION_END_DATE
						const key = Object.entries(entry)
							.filter(([field]) => field !== 'START_DATE' && field !== 'END_DATE' && field !== 'SUBMISSION_END_DATE')
							.map(([_, value]) => value)
							.join('_');

						// Update the map with the entire entry
						if (!resultMap.has(key)) {
							resultMap.set(key, entry);
						} else {
							const existingEntry = resultMap.get(key);

							// Compare and update START_DATE only if the new value is smaller
							if (new Date(entry.START_DATE) < new Date(existingEntry.START_DATE)) {
								existingEntry.START_DATE = entry.START_DATE;
							}

							// Compare and update END_DATE only if the new value is greater
							if (new Date(entry.END_DATE) > new Date(existingEntry.END_DATE)) {
								existingEntry.END_DATE = entry.END_DATE;
							}

							// Compare and update SUBMISSION_END_DATE only if the new value is greater
							if (new Date(entry.SUBMISSION_END_DATE) > new Date(existingEntry.SUBMISSION_END_DATE)) {
								existingEntry.SUBMISSION_END_DATE = entry.SUBMISSION_END_DATE;
							}
						}
					});

					// Convert the map values to an array
					aClaimTypeList = Array.from(resultMap.values());

					component.AppModel.setProperty("/claimRequest/claimTypeList", aClaimTypeList);
					//begin of new logic -24 Feb 2023
					var prevClaimType;
					var claimTypeNotUnique;
					for (var j = 0; j < aClaimTypeList.length; j++) {
						if (j > 0 && prevClaimType !== aClaimTypeList[j].CLAIM_TYPE_C) {
							claimTypeNotUnique = "Y";
							break;
						}
						prevClaimType = aClaimTypeList[j].CLAIM_TYPE_C;
					}
					//end of of new logic -24 Feb 2023
					if (aClaimTypeList.length === 1 || !claimTypeNotUnique) { //added condition claimTypeNotUnique on 24 Feb 2023
						var objClaimType = {
							"SF_STF_NUMBER": aClaimTypeList[0].SF_STF_NUMBER,
							"STF_NUMBER": aClaimTypeList[0].STF_NUMBER,
							"START_DATE": aClaimTypeList[0].START_DATE,
							"END_DATE": aClaimTypeList[0].END_DATE,
							"CLAIM_TYPE_C": aClaimTypeList[0].CLAIM_TYPE_C,
							"CLAIM_TYPE_T": aClaimTypeList[0].CLAIM_TYPE_T,
							"SUBMISSION_END_DATE": aClaimTypeList[0].SUBMISSION_END_DATE,
							"PAST_MONTHS": aClaimTypeList[0].PAST_MONTHS,
							"JOIN_DATE": aClaimTypeList[0].JOIN_DATE
						};
						component.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeList", [objClaimType]);
						component.AppModel.setProperty("/claimRequest/createClaimRequest/claimType", aClaimTypeList[0].CLAIM_TYPE_C);
						component.setClaimRequestTypeList(component);
						component.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeDesc", aClaimTypeList[0].CLAIM_TYPE_T);
						//begin of new logic -24 Feb 2023
						// var monthListSet = [];
						// for (var j = 0; j < aClaimTypeList.length; j++) {
						// 	var joinDate = Formatter.formatDateAsString(aClaimTypeList[j].JOIN_DATE, "yyyy-MM-dd");
						// 	var startDate = Formatter.formatDateAsString(aClaimTypeList[j].START_DATE, "yyyy-MM-dd");
						// 	var endDate = Formatter.formatDateAsString(aClaimTypeList[j].END_DATE, "yyyy-MM-dd");
						// 	var staffNo = aClaimTypeList[j].STF_NUMBER;
						// 	var sfStaffNo = aClaimTypeList[j].SF_STF_NUMBER;
						// 	var pastMonths = parseInt(aClaimTypeList[j].PAST_MONTHS, 10);
						// 	var totalMonths = pastMonths + 1;
						// 	var currentDate = new Date();
						// 	var currentYear = currentDate.getFullYear();
						// 	var currentMonth = currentDate.getMonth();

						//if (userRole === "ESS") { //to uncomment and add the logic for CA
						that._performSelectMonthLogic(userRole, aClaimTypeList, component);
						//	this._fnNavToDashboard(component);
						// for (var i = 0; i < totalMonths; i++) {
						// 	var monthListSetItem = {};
						// 	var CurrentMonthEigibleCondition;
						// 	var previousMonthEigibleCondition;
						// 	if (i === 0) {
						// 		var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);
						// 		currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");
						// 		currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
						// 		// if (currentMonthFirstDate >= startDate && currentMonthFirstDate <= endDate && currentDate >= startDate && currentDate <=
						// 		// 	endDate && joinDate <= currentDate) { //adding logic for joining date validation
						// 		if (startDate <= currentDate && endDate >= currentMonthFirstDate) { //adding logic for joining date validation								
						// 			if (staffNo === sfStaffNo) {
						// 				if (joinDate <= currentDate) {
						// 					CurrentMonthEigibleCondition = 'Y';
						// 				} else {
						// 					continue;
						// 				}

						// 			} else {
						// 				CurrentMonthEigibleCondition = 'Y';
						// 			}

						// 		}
						// 		if (CurrentMonthEigibleCondition === 'Y') {
						// 			var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
						// 			monthListSetItem.monthCode = currentYear + '-' + currentMonth;
						// 			monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
						// 			//add only if it's not already added in monthListSet array
						// 			var monthCodeDuplicate;
						// 			for (var k = 0; k < monthListSet.length; k++) {
						// 				if (monthListSetItem.monthCode === monthListSet[k].monthCode) {
						// 					monthCodeDuplicate = 'Y';
						// 					break;
						// 				}
						// 			}
						// 			if (!monthCodeDuplicate) {
						// 				monthListSet.push(monthListSetItem);
						// 			}
						// 		}
						// 	} else {
						// 		var prevMonth = currentMonth - i;
						// 		if (prevMonth < 0) {
						// 			var year = currentYear - 1;
						// 		} else {
						// 			year = currentYear;
						// 		}
						// 		prevMonth = Formatter.convertMonthcodeToPrevMonthCode(prevMonth);
						// 		var previousMonthFirstDate = new Date(Number(year), prevMonth, 1);
						// 		var previousMonthLastDate = new Date(Number(year), prevMonth + 1, 0);
						// 		previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
						// 		previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
						// 		// if (previousMonthFirstDate >= startDate && previousMonthFirstDate <= endDate && previousMonthLastDate >= startDate &&
						// 		// 	previousMonthLastDate <= endDate && joinDate <= previousMonthLastDate) {
						// 		if (startDate <= previousMonthLastDate && endDate >= previousMonthFirstDate) {
						// 			if (staffNo === sfStaffNo) {
						// 				if (joinDate <= previousMonthLastDate) {
						// 					previousMonthEigibleCondition = 'Y';
						// 				} else {
						// 					continue;
						// 				}

						// 			} else {
						// 				previousMonthEigibleCondition = 'Y';
						// 			}

						// 		}
						// 		if (previousMonthEigibleCondition === 'Y') {
						// 			monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
						// 			monthListSetItem.monthCode = year + '-' + prevMonth;
						// 			monthListSetItem.monthName = monthnameEligible + ',' + ' ' + year;
						// 			//	monthListSet.push(monthListSetItem);
						// 			//add only if it's not already added in monthListSet array
						// 			var monthCodeDuplicate;
						// 			for (var k = 0; k < monthListSet.length; k++) {
						// 				if (monthListSetItem.monthCode === monthListSet[k].monthCode) {
						// 					monthCodeDuplicate = 'Y';
						// 					break;
						// 				}
						// 			}
						// 			if (!monthCodeDuplicate) {
						// 				monthListSet.push(monthListSetItem);
						// 			}
						// 		}
						// 	}

						// }
						//	}
					} //for loop on claimtypelist ends
					//sort the array of monthListSet by monthcode descending
					// monthListSet.sort((a, b) => {
					// 	var fa = a.monthCode,
					// 		fb = b.monthCode;

					// 	if (fa < fb) {
					// 		return -1;
					// 	}
					// 	if (fa > fb) {
					// 		return 1;
					// 	}
					// 	return 0;
					// });

					// var joinDate = Formatter.formatDateAsString(aClaimTypeList[0].JOIN_DATE, "yyyy-MM-dd");
					// var startDate = Formatter.formatDateAsString(aClaimTypeList[0].START_DATE, "yyyy-MM-dd");
					// var endDate = Formatter.formatDateAsString(aClaimTypeList[0].END_DATE, "yyyy-MM-dd");
					// var pastMonths = parseInt(aClaimTypeList[0].PAST_MONTHS, 10);
					// var totalMonths = pastMonths + 1;
					// var currentDate = new Date();
					// var currentYear = currentDate.getFullYear();
					// var currentMonth = currentDate.getMonth();
					// var monthListSet = [];
					// if (userRole === "ESS") { //to uncomment and add the logic for CA
					// 	for (var i = 0; i < totalMonths; i++) {
					// 		var monthListSetItem = {};
					// 		if (i === 0) {
					// 			var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);
					// 			currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");
					// 			currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
					// 			// if (currentMonthFirstDate >= startDate && currentMonthFirstDate <= endDate && currentDate >= startDate && currentDate <=
					// 			// 	endDate && joinDate <= currentDate) { //adding logic for joining date validation
					// 			if (startDate <= currentDate && endDate >= currentMonthFirstDate && joinDate <= currentDate) { //adding logic for joining date validation								
					// 				var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
					// 				monthListSetItem.monthCode = currentYear + '-' + currentMonth;
					// 				monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
					// 				monthListSet.push(monthListSetItem);
					// 			}
					// 		} else {
					// 			var prevMonth = currentMonth - i;
					// 			if (prevMonth < 0) {
					// 				var year = currentYear - 1;
					// 			} else {
					// 				year = currentYear;
					// 			}
					// 			prevMonth = Formatter.convertMonthcodeToPrevMonthCode(prevMonth);
					// 			var previousMonthFirstDate = new Date(Number(year), prevMonth, 1);
					// 			var previousMonthLastDate = new Date(Number(year), prevMonth + 1, 0);
					// 			previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
					// 			previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
					// 			// if (previousMonthFirstDate >= startDate && previousMonthFirstDate <= endDate && previousMonthLastDate >= startDate &&
					// 			// 	previousMonthLastDate <= endDate && joinDate <= previousMonthLastDate) {
					// 			if (startDate <= previousMonthLastDate && endDate >= previousMonthFirstDate && joinDate <= previousMonthLastDate) {
					// 				monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
					// 				monthListSetItem.monthCode = year + '-' + prevMonth;
					// 				monthListSetItem.monthName = monthnameEligible + ',' + ' ' + year;
					// 				monthListSet.push(monthListSetItem);
					// 			}
					// 		}
					// 	}

					// }
					//end of of new logic -24 Feb 2023		
					// if (userRole === "CA") {
					// 	for (var i = 0; i < totalMonths; i++) {
					// 		var monthListSetItem = {};
					// 		if (i === 0) {
					// 			var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);

					// 			currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");

					// 			currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
					// 			var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
					// 			monthListSetItem.monthCode = currentYear + '-' + currentMonth;
					// 			monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
					// 			monthListSet.push(monthListSetItem);
					// 		} else {
					// 			var prevMonth = currentMonth - i;
					// 			if (prevMonth < 0) {
					// 				var year = currentYear - 1;
					// 			} else {
					// 				year = currentYear;
					// 			}

					// 			prevMonth = Formatter.convertMonthcodeToPrevMonthCode(prevMonth);
					// 			var previousMonthFirstDate = new Date(Number(year), prevMonth, 1);
					// 			var previousMonthLastDate = new Date(Number(year), prevMonth + 1, 0);
					// 			previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
					// 			previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
					// 			monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
					// 			monthListSetItem.monthCode = year + '-' + prevMonth;
					// 			monthListSetItem.monthName = monthnameEligible + ',' + ' ' + year;
					// 			monthListSet.push(monthListSetItem);
					// 			//	}
					// 		}
					// 	}
					// }
					// component.AppModel.setProperty("/claimRequest/monthList", monthListSet);

					//	}
				}.bind(component));

			},
			_settingUluFdluRadioButton: function (component) {
				var UluFdluList = [];
				var UluFdluListSetItem = {};
				var primaryAssigment = component.AppModel.getProperty("/primaryAssigment");
				//	monthCode = monthCode - 1;
				UluFdluListSetItem.Text = primaryAssigment.ULU_T.concat(" / ", primaryAssigment.FDLU_T);
				UluFdluListSetItem.Selected = true;
				UluFdluList.push(UluFdluListSetItem);

				var otherAssignments = component.AppModel.getProperty("/otherAssignments");

				for (var i = 0; i < otherAssignments.length; i++) {
					var UluFdluListSetItem = {};
					UluFdluListSetItem.Text = otherAssignments[i].ULU_T.concat(" / ", otherAssignments[i].FDLU_T);
					UluFdluListSetItem.Selected = false;
					UluFdluList.push(UluFdluListSetItem);
				}
				return UluFdluList;
			},
			_onSelectMonth: function (oEvent, component) {
				component.AppModel.setProperty("/claimRequest/createClaimRequest/monthName", oEvent.getParameters().selectedItem.getProperty("text"));
				var aSelectedMonth = oEvent.getParameters().selectedItem.getProperty("key");
				var selectedMonthYear = aSelectedMonth.split("-")[0];
				var selectedMonth = parseInt(aSelectedMonth.split("-")[1], 10);
				var actSelMonYearInNo;
				if ((selectedMonth + 1).toString().length === 1) {
					actSelMonYearInNo = (0 + (selectedMonth + 1).toString()) + '-' + selectedMonthYear;
				} else {
					actSelMonYearInNo = (selectedMonth + 1) + '-' + selectedMonthYear;
				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/actSelMonYearInNo", actSelMonYearInNo);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/CLAIM_MONTH", selectedMonth);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/CLAIM_YEAR", selectedMonthYear);
				var joinDate = component.AppModel.getProperty("/claimRequest/createClaimRequest/JOIN_DATE");
				var joinDateFmt = new Date(joinDate);
				var firstDateMonth = new Date(selectedMonthYear, selectedMonth, 1);
				if (joinDateFmt > firstDateMonth && joinDateFmt.getMonth() === firstDateMonth.getMonth()) {
					component.AppModel.setProperty("/claimRequest/createClaimRequest/minDateMonth", joinDateFmt);
				} else {
					component.AppModel.setProperty("/claimRequest/createClaimRequest/minDateMonth", new Date(selectedMonthYear, selectedMonth, 1));
				}

				component.AppModel.setProperty("/claimRequest/createClaimRequest/maxDateMonth", new Date(selectedMonthYear, selectedMonth + 1, 0));

				//clearing the staff information

				component.AppModel.setProperty("/claimRequest/createClaimRequest/staffList", []);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/claimantNusNetId", "");
				component.AppModel.setProperty("/claimRequest/createClaimRequest/claimantStaffId", "");
			},
			_confirmAction: function (component) {
				var selectedYear = component.AppModel.getProperty("/claimRequest/year");
				var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_T");
				var selectedMonth = component.AppModel.getProperty("/claimRequest/createClaimRequest/month"); //Period
				var ulu = component.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelected"); //ULU
				var fdlu = component.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelected"); //FDLU
				var singleSubRadioSelected = component.AppModel.getProperty("/claimRequest/SingleSubRadioSelected"); //Single submission radiobutton
				var staffId = component.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/STAFF_FULL_NAME"); //Staff ID
				var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType"); //claim Request Type
				if (!claimType || !selectedMonth || !ulu || !fdlu) {
					component.showMessageStrip("claimTypeMessageStripId", "Please provide * required fields", "E", "ClaimTypeDialog");
				} else if (singleSubRadioSelected && (!staffId || !claimRequestType)) {
					component.showMessageStrip("claimTypeMessageStripId", "Please provide * required fields", "E", "ClaimTypeDialog");
				} else {
					component.showBusyIndicator();
					component.closeClaimTypeDialog();
					var month = component.AppModel.getProperty("/claimRequest/month");
					component.AppModel.setProperty("/claimRequest/minSelectedDate", new Date(Number(selectedYear), month, 1));
					component.AppModel.setProperty("/claimRequest/maxSelectedDate", new Date(Number(selectedYear), month, Formatter.getLastDay(Number(
							selectedYear),
						month)));

					if (component.AppModel.getProperty("/userRole") === "ESS") {
						staffId = component.AppModel.getProperty("/loggedInUserId");
					} else {
						staffId = component.AppModel.getProperty("/staffId");
					}
					component.hideBusyIndicator();
					component.oRouter.navTo("detail", {
						project: "NEW",
						layout: "MidColumnFullScreen"
					});

				}
			},
			_onPressSearchClaimRequest: function (sValue, component) {
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
				return [finalFilterGrp];
			},
			_handleLocking: function (component, requestStatus, draftId, nusnetId, callBackFx) {
				if (requestStatus === 'LOCK' || (requestStatus === 'UNLOCK' &&
						component.AppModel.getProperty("/claimRequest/createClaimRequest/requestLocked") === 'Y')) {
					var oHeaders = Utility._headerToken(component);
					var serviceUrl = Config.dbOperations.requestLock;
					var oParameter = {
						"NUSNET_ID": nusnetId,
						"REQUEST_STATUS": requestStatus,
						"DRAFT_ID": draftId,
						"PROCESS_CODE": component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType"),
						"STAFF_ID": component.AppModel.getProperty("/loggedInUserStfNumber"),
						"REQUESTOR_GRP": ""
					};
					Services._loadDataUsingJsonModel(serviceUrl, oParameter, "POST", oHeaders, function (oData) {
						callBackFx(oData);
					}.bind(component));
				}
			},

			_performSelectMonthLogic: function (userRole, aClaimTypeList, component, selectedClaimType) {
				var monthListSet = [];
				for (var j = 0; j < aClaimTypeList.length; j++) {
					if ((selectedClaimType && selectedClaimType === aClaimTypeList[j].CLAIM_TYPE_C) || !selectedClaimType) {

						//	}
						var joinDate = Formatter.formatDateAsString(aClaimTypeList[j].JOIN_DATE, "yyyy-MM-dd");
						component.AppModel.setProperty("/claimRequest/createClaimRequest/JOIN_DATE", aClaimTypeList[j].JOIN_DATE);
						component.AppModel.setProperty("/claimRequest/createClaimRequest/ACTUAL_JOIN_DATE_FORMAT", joinDate);
						var startDate = Formatter.formatDateAsString(aClaimTypeList[j].START_DATE, "yyyy-MM-dd");
						var endDate = Formatter.formatDateAsString(aClaimTypeList[j].END_DATE, "yyyy-MM-dd");
						var staffNo = aClaimTypeList[j].STF_NUMBER;
						var sfStaffNo = aClaimTypeList[j].SF_STF_NUMBER;
						var pastMonths = parseInt(aClaimTypeList[j].PAST_MONTHS, 10);
						var totalMonths = pastMonths + 1;
						var currentDate = new Date();
						var currentYear = currentDate.getFullYear();
						var currentMonth = currentDate.getMonth();

						if (userRole === "ESS") { //to uncomment and add the logic for CA							
							for (var i = 0; i < totalMonths; i++) {
								var monthListSetItem = {};
								var CurrentMonthEigibleCondition = 'N';
								var previousMonthEigibleCondition = 'N';
								if (i === 0) {
									var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);
									currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");
									currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
									// if (currentMonthFirstDate >= startDate && currentMonthFirstDate <= endDate && currentDate >= startDate && currentDate <=
									// 	endDate && joinDate <= currentDate) { //adding logic for joining date validation
									if (startDate <= currentDate && endDate >= currentMonthFirstDate) { //adding logic for joining date validation								
										if (staffNo === sfStaffNo) {
											if (joinDate <= currentDate) {
												CurrentMonthEigibleCondition = 'Y';
											} else {
												continue;
											}

										} else {
											CurrentMonthEigibleCondition = 'Y';
										}

									}
									if (CurrentMonthEigibleCondition === 'Y') {
										var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
										monthListSetItem.monthCode = currentYear + '-' + currentMonth;
										monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
										//add only if it's not already added in monthListSet array
										var monthCodeDuplicate;
										for (var k = 0; k < monthListSet.length; k++) {
											if (monthListSetItem.monthCode === monthListSet[k].monthCode) {
												monthCodeDuplicate = 'Y';
												break;
											}
										}
										if (!monthCodeDuplicate) {
											monthListSet.push(monthListSetItem);
										}
									}
								} else {
									var prevMonth = currentMonth - i;
									if (prevMonth < 0) {
										var year = currentYear - 1;
									} else {
										year = currentYear;
									}
									prevMonth = Formatter.convertMonthcodeToPrevMonthCode(prevMonth);
									var previousMonthFirstDate = new Date(Number(year), prevMonth, 1);
									var previousMonthLastDate = new Date(Number(year), prevMonth + 1, 0);
									previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
									previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
									// if (previousMonthFirstDate >= startDate && previousMonthFirstDate <= endDate && previousMonthLastDate >= startDate &&
									// 	previousMonthLastDate <= endDate && joinDate <= previousMonthLastDate) {
									if (startDate <= previousMonthLastDate && endDate >= previousMonthFirstDate) {
										if (staffNo === sfStaffNo) {
											if (joinDate <= previousMonthLastDate) {
												previousMonthEigibleCondition = 'Y';
											} else {
												continue;
											}

										} else {
											previousMonthEigibleCondition = 'Y';
										}

									}
									if (previousMonthEigibleCondition === 'Y') {
										monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
										monthListSetItem.monthCode = year + '-' + prevMonth;
										monthListSetItem.monthName = monthnameEligible + ',' + ' ' + year;
										//	monthListSet.push(monthListSetItem);
										//add only if it's not already added in monthListSet array
										var monthCodeDuplicate;
										for (var k = 0; k < monthListSet.length; k++) {
											if (monthListSetItem.monthCode === monthListSet[k].monthCode) {
												monthCodeDuplicate = 'Y';
												break;
											}
										}
										if (!monthCodeDuplicate) {
											monthListSet.push(monthListSetItem);
										}
									}
								}

							}
						}
						if (userRole === "CA") {
							for (var i = 0; i < totalMonths; i++) {
								var monthListSetItem = {};
								if (i === 0) {
									var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);

									currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");

									currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
									var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
									monthListSetItem.monthCode = currentYear + '-' + currentMonth;
									monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
									monthListSet.push(monthListSetItem);
								} else {
									var prevMonth = currentMonth - i;
									if (prevMonth < 0) {
										var year = currentYear - 1;
									} else {
										year = currentYear;
									}

									prevMonth = Formatter.convertMonthcodeToPrevMonthCode(prevMonth);
									var previousMonthFirstDate = new Date(Number(year), prevMonth, 1);
									var previousMonthLastDate = new Date(Number(year), prevMonth + 1, 0);
									previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
									previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
									monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
									monthListSetItem.monthCode = year + '-' + prevMonth;
									monthListSetItem.monthName = monthnameEligible + ',' + ' ' + year;
									monthListSet.push(monthListSetItem);
									//	}
								}
							}
						}
						// component.AppModel.setProperty("/claimRequest/monthList", monthListSet);					
					}
				}
				component.AppModel.setProperty("/claimRequest/monthList", monthListSet);
			}
		});
		return claimTypeDataHandling;
	},
	true);