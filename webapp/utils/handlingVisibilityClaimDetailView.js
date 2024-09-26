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
		var handlingVisibilityClaimDetailView = ("nus.edu.sg.claimrequest.utils.handlingVisibilityClaimDetailView", {
			_fnSetVisibility: function (component, sourceReq, requestData) {
				var userRole = component.AppModel.getProperty("/userRole");
				var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
				var reqStatus = component.AppModel.getProperty("/claimRequest/createClaimRequest/reqStatus");
				var oCreateClaimRequest = component.AppModel.getProperty("/claimRequest/createClaimRequest");
				// var aRateTypeDetails = oCreateClaimRequest.RateTypeDetails;
				//please note this ratetype code will have values only for claim type 102
				var rateTypeCode = component.AppModel.getProperty("/claimRequest/createClaimRequest/rateType");
				//handling for the token removal
				component.getUIControl("inpVerifierValueHelp").removeAllTokens([]);
				component.getUIControl("inpAddApprv1ValueHelp").removeAllTokens([]);
				component.getUIControl("inpAddApprv2ValueHelp").removeAllTokens([]);
				//end of token removal
				if (userRole === 'ESS') {
					component.AppModel.setProperty("/visibility/ClaimDetailView/Date", true);
					component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", false);
					component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", false);
					component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false); //added to disable Rate Amount when for Claimant login

					if (reqStatus === '01' || !reqStatus) {
						if (oCreateClaimRequest.claimType === "102") {
							if (rateTypeCode === "18") {
								component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
								component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", false); //added to disable Rate Amount when for Claimant login
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
							} else {
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", true); //added to disable Rate Amount when for Claimant login
								component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
							}
							component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", true);
						} else {
							component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
						}
						// component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
						component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", true);
						component.AppModel.setProperty("/visibility/ClaimDetailView/UluFdluSelection", true);
						component.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", true);
						component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", true);
					} else {
						if (reqStatus === '15' || reqStatus === '07') {
							component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/UluFdluSelection", false);

							// added to not disable the control even though we store the claim in draft state
							component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/WBS", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", true);

							if (oCreateClaimRequest.claimType === "102" && rateTypeCode === "18") {
								component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
								component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", false); //added to disable Rate Amount when for Claimant login
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
							}else if(oCreateClaimRequest.claimType === "102" && rateTypeCode === "19"){
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
							}
						} else {
							component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/UluFdluSelection", false);

							// added to not disable the control even though we store the claim in draft state
							component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/WBS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", false);
							//added to handle Header Remarks visibility
							component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);

							if (oCreateClaimRequest.claimType === "102" && rateTypeCode === "19") {
								component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", true); //added to disable Rate Amount when for Claimant login
							}

						}

					}
					if (sourceReq === "NEW") {
						component.AppModel.setProperty("/showSaveButton", true);
						component.AppModel.setProperty("/showSubmitButton", true);
						component.AppModel.setProperty("/showWithdrawButton", false);
					} else {
						if (!!requestData && requestData.VERIFIER_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
						}
						if (!!requestData && requestData.ADD_APP_1_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
						}
						if (!!requestData && requestData.ADDITIONAL_APP_2_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
							component.AppModel.setProperty("/showAdditonalApprover2", true); //added to ensure Ad App2 is shown for claimant as well
							// component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
							// component.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
							// component.AppModel.setProperty("/showAdditionalApproverLink", false);
						}
						/*	component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/WBS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", false);*/
					}
				} else {
					if (userRole === 'CA') {

						if (sourceReq === "NEW") {
							component.AppModel.setProperty("/showSaveButton", true);
							component.AppModel.setProperty("/showSubmitButton", true);
							component.AppModel.setProperty("/showWithdrawButton", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", true);
							if (oCreateClaimRequest.claimType === "102") {
								if (rateTypeCode === "18") {
									component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
									component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
									component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
									component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", false);
									component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", false);
									component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", false); //added to disable Rate Amount when for Claimant login
									component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);

								} else {
									component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
									component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
									component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", true); //added to disable Rate Amount when for Claimant login
									component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", true);
								}
								component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", true);
							} else {
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
							}
						}
						if (claimRequestType === 'Daily') {
							component.AppModel.setProperty("/visibility/ClaimDetailView/Date", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", true);
							//Added Status 18 as well
							if (reqStatus === '01' || reqStatus === '02' || reqStatus === '08' || reqStatus === '18' || reqStatus === '16' || reqStatus ===
								'17' || !reqStatus) {
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", true);
								if (oCreateClaimRequest.claimType === "102") {
									if (rateTypeCode === "18") {
										component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
										component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", false); //added to disable Rate Amount when for Claimant login
										component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
									} else {
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
										component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", true); //added to disable Rate Amount when for Claimant login
										component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", true);
									}
									component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", true);
								}
							} else {
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
								//added to handle Header Remarks visibility
								component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
							}

						} else {
							if (claimRequestType === 'Period') {
								component.AppModel.setProperty("/visibility/ClaimDetailView/Date", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
								//Added status 18 as well
								if (reqStatus === '01' || reqStatus === '02' || reqStatus === '08' || reqStatus === '18' || reqStatus === '16' || reqStatus ===
									'17' || !reqStatus) {
									component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", true);
								} else {
									component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
									//added to handle Header Remarks visibility
									component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
								}
								var claimStartDate = component.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
								var claimEndDate = component.AppModel.getProperty("/claimRequest/createClaimRequest/maxDateMonth");
								// var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
								// 	format: "yMMMd"
								// });
								// var claimStartDateDisplay = oDateFormat.format(claimStartDate);
								// var aSplitStartDate = claimStartDateDisplay.split(" ");
								// claimStartDateDisplay = aSplitStartDate[0] + "-" + aSplitStartDate[1] + "-" + aSplitStartDate[2];
								// var claimEndDateDisplay = oDateFormat.format(claimEndDate);
								// var aSplitEndDate = claimEndDateDisplay.split(" ");
								// claimEndDateDisplay = aSplitEndDate[0] + "-" + aSplitEndDate[1] + "-" + aSplitEndDate[2];

								var itemsSet = component.AppModel.getProperty("/claimRequest/createClaimRequest/RateTypeDetails");
								var selMonthRateTypeNamountList = component.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
								var RateTypeDetails = [];
								//	var selectedDayListAmountSet = [];
								claimStartDate = Formatter.formatDateAsString(claimStartDate, "yyyy-MM-dd");
								claimEndDate = Formatter.formatDateAsString(claimEndDate, "yyyy-MM-dd");

								//handling ratetype dropdown
								if (selMonthRateTypeNamountList) {
									selMonthRateTypeNamountList.forEach(function (item, index) {
										var prevRateType;
										//var countOfSelRateTypFrmCalPopInRateTypList = 0;
										for (var i = 0; i < item.aAmountListitems.length; i++) {
											var rateTypeListSetItem = {};
											var amountListSetItem = {};
											var startDate = Formatter.formatDateAsString(item.aAmountListitems[i].START_DATE, "yyyy-MM-dd");
											var endDate = Formatter.formatDateAsString(item.aAmountListitems[i].END_DATE, "yyyy-MM-dd");

											if (claimStartDate >= startDate && claimEndDate <= endDate) {

												//	if (i === 0) {
												amountListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
												//	selectedDayListAmountSet.push(amountListSetItem);
												//				countOfSelRateTypFrmCalPopInRateTypList = countOfSelRateTypFrmCalPopInRateTypList + 1;
												//				var defaultRateAmount = item.aAmountListitems[i].AMOUNT;
												rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
												rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
												rateTypeListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
												if (prevRateType != item.RateTypeCode) {
													RateTypeDetails.push(rateTypeListSetItem);
												}
												prevRateType = item.RateTypeCode;
												//		}
												//else {
												// 				if (!item.RateTypeCode === itemElement.RATE_TYPE) {
												// 					amountListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
												// 					itemElement.selectedDayListAmountSet.push(amountListSetItem);
												// 					rateTypeListSetItem.RateTypeDesc = item.RateTypeDesc;
												// 					rateTypeListSetItem.RateTypeCode = item.RateTypeCode;
												// 					rateTypeListSetItem.AMOUNT = item.aAmountListitems[i].AMOUNT;
												// 					itemElement.RateTypeDetails.push(rateTypeListSetItem);
												// 				}
												// 			}

											}
										}
										prevRateType = undefined;
									});
								}
								//		RateTypeDetails.unshift('');
								//		selectedDayListAmountSet.unshift('');

								var aBlankRow = [{
									"CLAIM_START_DATE": claimStartDate,
									"CLAIM_END_DATE": claimEndDate,
									"RateTypeDetails": RateTypeDetails //itemsSet,
										//	"selectedDayListAmountSet": selectedDayListAmountSet //selMonthRateTypeNamountList
								}];
								if (sourceReq === "NEW") {
									component.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aBlankRow);
									//Don't allow deletion of the Row as there will be only one Row
									component.AppModel.setProperty("/enable/ClaimDetailView/ROW_DELETE", false);
								}

							} else {
								if (reqStatus === '01' || reqStatus === '02') {
									component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", true);
									component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", true);
								} else {
									component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
									component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
								}
							}
						}

						//disability of the control if already checked or rejected for CA]
						//Added Status 18 as well
						if ((reqStatus !== '01' && reqStatus !== '02' && reqStatus !== '08' && reqStatus !== '18' && reqStatus !== '17' && reqStatus !==
								'16' && sourceReq !==
								"NEW") || Utility._fnAppModelGetProperty(
								component,
								"/isClaimLocked")) {
							component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/WBS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/VERIFIER_SRCH_HELP", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ADD_1_SRCH_HELP", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
							component.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", false);
							//added to handle Header Remarks visibility
							component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
							component.AppModel.setProperty("/showAdditionalApproverLink", false);

							//handling Additional approver 2
							if (requestData && !!requestData.ADDITIONAL_APP_2_REFERENCE_ID) {
								component.AppModel.setProperty("/showAdditonalApprover2", true);
								component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
							}
							if (requestData.VERIFIER_NUSNET_ID) {
								component._fnAddToken(component.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(component,
									"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
									"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
							}
							if (requestData.ADD_APP_1_NUSNET_ID) {
								component._fnAddToken(component.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(component,
									"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
									"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
							}
							if (requestData.ADDITIONAL_APP_2_NUSNET_ID) {
								component._fnAddToken(component.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(component,
									"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
									"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
								// component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
								// component.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
								// component.AppModel.setProperty("/showAdditionalApproverLink", false);
							}
							// to make this column visible for the CA if submitting the claim on Hourly rate for claimant
							if (oCreateClaimRequest.claimType === "102" && rateTypeCode === "19") {
								component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
								component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", true); 
							}

						} else {
							//Added Status 18 as well
							if (oCreateClaimRequest.claimType !== "102") {
								if (reqStatus === '01' || reqStatus === '02' || reqStatus !== '17' || reqStatus !== '08' || reqStatus !== '18' || reqStatus !==
									'16') {
									component.AppModel.setProperty("/enable/ClaimDetailView/VERIFIER_SRCH_HELP", true);
									component.AppModel.setProperty("/enable/ClaimDetailView/ADD_1_SRCH_HELP", true);
									component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
									component.AppModel.setProperty("/showAdditionalApproverLink", true);
									component.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", true);
									//handling Additional approver 2
									if (!!requestData && !!requestData.ADDITIONAL_APP_2_REFERENCE_ID) {
										component.AppModel.setProperty("/showAdditonalApprover2", true);
										component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
									}
								}
								if (!!requestData && requestData.VERIFIER_NUSNET_ID) {
									component._fnAddToken(component.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(component,
										"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
										"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
								}
								if (!!requestData && requestData.ADD_APP_1_NUSNET_ID) {
									component._fnAddToken(component.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(component,
										"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
										"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
								}
								if (!!requestData && requestData.ADDITIONAL_APP_2_NUSNET_ID) {
									component._fnAddToken(component.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(component,
										"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
										"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
									component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
									component.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
									component.AppModel.setProperty("/showAdditionalApproverLink", false);
								}
							}
						}

					} else if (userRole === 'VERIFIER' || Utility._fnAppModelGetProperty(component, "/isClaimLocked")) {
						component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/WBS", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/VERIFIER_SRCH_HELP", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ADD_1_SRCH_HELP", true);
						component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
						component.AppModel.setProperty("/exitFullScreen", false);
						component.AppModel.setProperty("/closeColumn", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", false);

						if (requestData.VERIFIER_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
						}
						if (requestData.ADD_APP_1_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
						}
						if (requestData.ADDITIONAL_APP_2_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
							component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
							component.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
							component.AppModel.setProperty("/showAdditionalApproverLink", false);
							component.AppModel.setProperty("/showAdditonalApprover2", true);
						}

						//disability of the control if already checked or rejected for CA]
						if (reqStatus !== '03' || Utility._fnAppModelGetProperty(component, "/isClaimLocked")) {
							component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
							component.AppModel.setProperty("/showAdditonalApprover2", true);
							//added to handle Header Remarks visibility
							if (userRole === 'VERIFIER') {
								component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
							}
						}

						if (claimRequestType === 'Daily') {
							component.AppModel.setProperty("/visibility/ClaimDetailView/Date", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", true);
							//to fix the issue of showing the buttons for Verifier logging	
							if (userRole === 'VERIFIER') {
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
							}
						} else {
							component.AppModel.setProperty("/visibility/ClaimDetailView/Date", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
						}

					} else if (userRole === 'APPROVER' || userRole === 'ADDITIONAL_APP_1' || userRole === 'ADDITIONAL_APP_2' || userRole ===
						'REPORTING_MGR' || Utility._fnAppModelGetProperty(
							component, "/isClaimLocked")) {
						component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ADD", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_START_DATE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_END_DATE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/CLAIM_DAY_TYPE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/START_TIME", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/END_TIME", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/HOURS_UNIT", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/IS_DISCREPENCY", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/DISC_RATETYPE_AMOUNT", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/WBS", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/REMARKS", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/VERIFIER_SRCH_HELP", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ADD_1_SRCH_HELP", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
						component.AppModel.setProperty("/exitFullScreen", false);
						component.AppModel.setProperty("/closeColumn", false);
						component.AppModel.setProperty("/enable/ClaimDetailView/ATTACHMENT_UPLOAD", true);

						if (requestData.VERIFIER_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
						}
						if (requestData.ADD_APP_1_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
						}
						if (requestData.ADDITIONAL_APP_2_NUSNET_ID) {
							component._fnAddToken(component.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
								"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
							//Added the below 2 lines in order to ensure Additional Approver 2 shows if the value is coming from the backend 
							component.AppModel.setProperty("/showAdditonalApprover2", true);
							component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", false);
							// component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
							// component.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
							// component.AppModel.setProperty("/showAdditionalApproverLink", false);
						}

						//added to handle Header Remarks visibility
						component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
						// if (Utility._fnAppModelGetProperty(component, "/isClaimLocked") {
						// 		component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", false);
						// } 
						if (reqStatus === '04' && userRole === 'ADDITIONAL_APP_1') {
							component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", true);
						} else if (reqStatus === '05' && userRole === 'ADDITIONAL_APP_2') {
							component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", true);
						} else if (reqStatus === '06' && (userRole === 'APPROVER' || userRole === 'REPORTING_MGR')) {
							component.AppModel.setProperty("/enable/ClaimDetailView/HEADER_REMARKS", true);
						}

						if (claimRequestType === 'Daily') {
							component.AppModel.setProperty("/visibility/ClaimDetailView/Date", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", true);
							//to fix the issue of these buttons showing for Approvers
							if (userRole === 'APPROVER' || userRole === 'ADDITIONAL_APP_1' || userRole === 'ADDITIONAL_APP_2' || userRole ===
								'REPORTING_MGR') {
								component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
								component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
							}
							if (oCreateClaimRequest.claimType === "102") {
									if (rateTypeCode === "18") {
										component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
										component.AppModel.setProperty("/enable/ClaimDetailView/ROW_ACTIONS", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", false);
										component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", false); //added to disable Rate Amount when for Claimant login
										component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
									} else {
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateType", true);
										component.AppModel.setProperty("/visibility/ClaimDetailView/RateAmount", true);
										component.AppModel.setProperty("/visibility/ClaimDetailView/TotalAmount", true); //added to disable Rate Amount when for Claimant login
										component.AppModel.setProperty("/enable/ClaimDetailView/RATE_TYPE_AMOUNT", false);
									}
									component.AppModel.setProperty("/enable/ClaimDetailView/wbsHeader", false);
								}
						} else {
							component.AppModel.setProperty("/visibility/ClaimDetailView/Date", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartDate", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndDate", true);
							component.AppModel.setProperty("/visibility/ClaimDetailView/StartTime", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/EndTime", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/SelectDates", false);
							component.AppModel.setProperty("/visibility/ClaimDetailView/ValidateWBS", false);
						}
					}
				}
				//Added to ensure Verifier and Add Approver details are populated while navigating from Claim Report			
				if (component.viaClaimReport === true) {
					if (!!requestData && requestData.VERIFIER_NUSNET_ID) {
						component._fnAddToken(component.getUIControl("inpVerifierValueHelp"), Utility._fnAppModelGetProperty(component,
							"/claimRequest/createClaimRequest/VERIFIER_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
							"/claimRequest/createClaimRequest/VERIFIER_STAFF_FULL_NAME"));
					}
					if (!!requestData && requestData.ADD_APP_1_NUSNET_ID) {
						component._fnAddToken(component.getUIControl("inpAddApprv1ValueHelp"), Utility._fnAppModelGetProperty(component,
							"/claimRequest/createClaimRequest/ADD_APP_1_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
							"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_FULL_NAME"));
					}
					if (!!requestData && requestData.ADDITIONAL_APP_2_NUSNET_ID) {
						component._fnAddToken(component.getUIControl("inpAddApprv2ValueHelp"), Utility._fnAppModelGetProperty(component,
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_NUSNET_ID"), Utility._fnAppModelGetProperty(component,
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_FULL_NAME"));
						component.AppModel.setProperty("/enable/ClaimDetailView/ADD_2_SRCH_HELP", true);
						component.AppModel.setProperty("/showRemoveAdditionalApproverLink", true);
						component.AppModel.setProperty("/showAdditionalApproverLink", false);
						component.AppModel.setProperty("/showAdditonalApprover2", true);
					}
				}
				this._fnHandlingLockingVisibility(component, sourceReq, requestData);
			},
			_fnHandlingLockingVisibility: function (component, sourceReq, requestData) {

			}
		});
		return handlingVisibilityClaimDetailView;
	},
	true);