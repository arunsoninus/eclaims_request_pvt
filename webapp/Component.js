sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	'sap/ui/model/json/JSONModel',
	"../model/models",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"../utils/configuration",
	"../utils/services"
], function (UIComponent, Device, JSONModel, models, FlexibleColumnLayoutSemanticHelper, Config, Services) {
	"use strict";

	return UIComponent.extend("nus.edu.sg.claimrequest.Component", {

		metadata: {
			manifest: "json"
		},
		onWindowBeforeUnload: function (oEvent) {
			// your code
			// debugger;
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + sap.ui.getCore().AppContext.TokenSession,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			var serviceUrl = Config.dbOperations.requestLock;
			var oParameter = {
				"NUSNET_ID": sap.ui.getCore().AppContext.STF_NUMBER,
				"REQUEST_STATUS": 'UNLOCK',
				"DRAFT_ID": sap.ui.getCore().AppContext.SelectedDraftID
			};

			var oModel = new JSONModel();
			var sPayload = null;
			sPayload = JSON.stringify(oParameter);
			var httpMethod = "POST";
			oModel.loadData(serviceUrl, sPayload, true, httpMethod, null, null, oHeaders);
			// debugger;
		},
		/**
		 * Fired when the window is closed.
		 */
		onWindowUnload: function (oEvent) {
			// debugger;
			// your code

			// debugger;
			/*oModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse);
			});*/

		},
		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			//set the app context object for global program data
			sap.ui.getCore().AppContext = new Object();
			sap.ui.getCore().AppContext.SelectedDraftID = "";
			sap.ui.getCore().AppContext.NUSNET_ID = "";
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			var oModel = new JSONModel();
			this.setModel(oModel);

			var oRouter = this.getRouter();
			oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
			oRouter.initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

		},
		getHelper: function () {
			return this._getFcl().then(function (oFCL) {
				var oSettings = {
					defaultTwoColumnLayoutType: "TwoColumnsMidExpanded",
					defaultThreeColumnLayoutType: "ThreeColumnsMidExpanded"
				};
				return (FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings));
			});
		},
		/**
		 * Make the UI Elements in compact size
		 */
		getContentDensityClass: function () {
			if (!this._sContentDensityClass) {
				// if (!Device.support.touch) {
				if (Device.support.touch) {
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		_onBeforeRouteMatched: function (oEvent) {
			var oModel = this.getModel(),
				sLayout = oEvent.getParameters().arguments.layout,
				oNextUIState;

			// If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
			if (!sLayout) {
				this.getHelper().then(function (oHelper) {
					oNextUIState = oHelper.getNextUIState(0);
					oModel.setProperty("/layout", oNextUIState.layout);
				});
				return;
			}

			oModel.setProperty("/layout", sLayout);
		},

		_getFcl: function () {
			return new Promise(function (resolve, reject) {
				var oFCL = this.getRootControl().byId('flexibleColumnLayout');
				if (!oFCL) {
					this.getRootControl().attachAfterInit(function (oEvent) {
						resolve(oEvent.getSource().byId('flexibleColumnLayout'));
					}, this);
					return;
				}
				resolve(oFCL);

			}.bind(this));
		}
	});
});