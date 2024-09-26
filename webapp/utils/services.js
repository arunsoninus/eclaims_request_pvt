sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"./configuration"
], function (JSONModel, Device, Config) {
	"use strict";

	return {

		fetchLoggedUserToken: function (sThis, callBackFx) {
			var that = this;
			var userModel = new sap.ui.model.json.JSONModel();
			userModel.loadData("/services/userapi/currentUser", null, false);
			sap.ui.getCore().setModel(userModel, "userapi");
			userModel.dataLoaded().then(function () {
				var sUserName = sap.ui.getCore().getModel("userapi").getData().name;
				// sUserName = 'PTT_CA1'; //'CHELUK';//'CHESHLE';//'YNCTHRJ';//'CHEAD';

	 //sUserName = 'CW_CA1'; //'PTT_UID151101';//'YNCTHRJ';
						// sUserName = 'CW_UID151512'// Monthly;
					// sUserName = 'OT_CA13'; // Hourly
					// sUserName = 'CW_CA1';
					// sUserName="PTT_UID151187";
					// sUserName="CW_RM1";
				sap.ui.getCore().AppContext.NUSNET_ID = sUserName;
				sThis.AppModel.setProperty("/loggedInUserId", sUserName);
				that._getUserDetails(sThis, sUserName, callBackFx);
			}.bind(sThis));
		},
		_getUserDetails: function (sThis, sUserName, callBackFx) {
		//	sUserName = 'PTT_UID151361'; //'CHELUK';//'CHESHLE';//'YNCTHRJ';//'CHEAD';
			// sUserName = 'PTT_CA1';
			//			sUserName = 'PTT_UID151100';
			var oHeaders = {
                    "Content-Type": "application/json"
                };
                var oPayload = {
                    "userName": sUserName
                };
			var sUrl = Config.dbOperations.eclaimAuthToken;
			var authModel = new JSONModel();
			
			authModel.loadData(sUrl, JSON.stringify(oPayload), false, "POST", false, false,oHeaders);
			
			// sUrl = sUrl + sUserName;
			// authModel.loadData(sUrl, null, false, "GET", false, false);

		//To break authorize call into 2 calls - authorize and userdetails
			//	authModel.getData().token
			var tokenDetails = authModel.getData();
			var userDetails = this.getUserInfoDetails(authModel.getData().token);
			Object.assign(userDetails, tokenDetails);
			callBackFx(userDetails);
		},

		getUserInfoDetails: function (userToken) {
			var userInfoModel = new JSONModel();
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + userToken,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			userInfoModel.loadData(Config.dbOperations.userDetails, null, false, "GET", false, false, oHeaders);
			return userInfoModel.getData();
		},

		fetchLoggeInUserImage: function (sThis, callBackFx) {
			var oPhotoModel = new JSONModel();
			var sUrl = Config.dbOperations.fetchPhotoUser;
			var staffId = sThis.AppModel.getProperty("/loggedInUserStfNumber");
			sUrl = sUrl + "?userId=" + staffId;
			// sUrl = sUrl + "?userId=CHELUK";
			//sUrl = sUrl + "?userId=10000027";
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"				
			};
			oPhotoModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
			oPhotoModel.attachRequestCompleted(function (oResponse) {
				var aPhoto = !oResponse.getSource().getData().d ? [] : oPhotoModel.getData().d.results;
				if (aPhoto.length) {
					callBackFx(oResponse.getSource().getData().d.results[0]);
				} else {
					callBackFx({});
				}
			}.bind(sThis));

		},

		fetchPhotoOfUser: function (sThis, staffId) {
			var oPhotoModel = new JSONModel();
			var sUrl = Config.dbOperations.fetchPhotoUser;
			sUrl = sUrl + "?userId=" + staffId;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"				
			};
			oPhotoModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
			oPhotoModel.attachRequestCompleted(function (oResponse) {
				sThis.AppModel.setProperty("/claimRequest/createClaimRequest/Photo", oResponse.getSource().getData().d.results[0] ?
					"data:image/png;base64," + oResponse.getSource().getData().d.results[0].photo : null);
			}.bind(sThis));

		},

		fetchFilterData: function (sThis, oPayload, callBackFx) {
			var sUrl = Config.dbOperations.fetchFilterLookup;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A"
			};

			var filterModel = new JSONModel();
			filterModel.loadData(sUrl, JSON.stringify(oPayload), null, "POST", null, null, oHeaders);
			filterModel.attachRequestCompleted(function (oResponse) {

				if (oResponse.getSource().getData() instanceof Object) {
					callBackFx(oResponse.getSource().getData());
				} else {
					callBackFx({});
				}
			}.bind(sThis));
		},
		fetchUserImageAsync: function (sThis, staffId) {
			var oPhotoModel = new JSONModel();
			var sUrl = Config.dbOperations.fetchPhotoUser;
			sUrl = sUrl + "?userId=" + staffId;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"				
			};
			oPhotoModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
			return !oPhotoModel.getData().d ? [] : oPhotoModel.getData().d.results;
		},
		fetchTaskProcessDetails: function (sThis, objData, callBackFx) {
			var oTaskProcessModel = new JSONModel();
			var sUrl = Config.dbOperations.taskProcessHistory;
			sUrl = sUrl + objData.DRAFT_ID;
			//Adding process code as well in the URL
			sUrl = sUrl + '&processCode=' + objData.CLAIM_TYPE;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"				
			};
			oTaskProcessModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
			callBackFx(oTaskProcessModel.getData());
		},
		retrieveTaskActionConfigDetails: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);

					}
				}.bind(component),
				error: function (oError) {}
			});
		},
		getEclaimsRequestViewCount: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);

					}
				}.bind(component),
				error: function (oError) {}
			});
		},
		// getStatusConfig: function (serviceUrl, oDataModel, component, callBackFx) {
		// 	oDataModel.read(serviceUrl, {
		// 		success: function (oData) {
		// 			if (oData) {
		// 				return callBackFx(oData);
		// 			}
		// 		}.bind(component),
		// 		error: function (oError) {}
		// 	});
		// },
		_readDataUsingOdataModel: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);

					}
				}.bind(component),
				error: function (oError) {
					callBackFx(oError);
				}
			});
		},
		_loadDataUsingJsonModel: function (serviceUrl, oPayload, httpMethod, headers, callBackFx) {
			var oModel = new JSONModel();
			var sPayload = null;
			if (oPayload) {
				if (httpMethod === "GET") {
					sPayload = oPayload;
				} else {
					sPayload = JSON.stringify(oPayload);
				}
			}
			oModel.loadData(serviceUrl, sPayload, null, httpMethod, null, null, headers);
			oModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse);
			});
		}
	};
});