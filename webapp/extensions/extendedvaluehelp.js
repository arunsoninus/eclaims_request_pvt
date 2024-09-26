jQuery.sap.declare("sap.m.ExtMultiInput");
sap.m.Input.extend("sap.m.ExtMultiInput", {

	metadata: {
		properties: {
			"dialogTitle": "string",
			"dialogCodeLbl": "string",
			"dialogDescLbl": "string",
			"dataPath": "string",
			"sorter": "string",
			"urlPath": "string",
			"urlAttr": "string",
			"setOnUI": "string",
			"labelCode": "string",
			"valueHelpKey": "string",
			"parameterPath": "string",
			"properties": "string",
			"modelProperties": "string",
			"tableDataPath": "string"

		}
	},
	renderer: "sap.m.InputRenderer",

	tableObj: "",
	sourceCallBack: "",

	openValueHelp: function (oEvent, uiTableModel, isSync, modelData, sourceType, callBack, showDesc) {
		if (sourceType) {
			this.sourceType = sourceType;
			this.callBack = callBack;
		}
		var processUrl = oEvent.getSource().getProperty("urlPath");
		this.desc = oEvent.getSource().getProperty("dialogDescLbl");
		this.code = oEvent.getSource().getProperty("dialogCodeLbl");
		this.valueId = oEvent.getParameter("id");
		this.dataPath = oEvent.getSource().getProperty("dataPath");
		var loadDataModel = this.createJSONModelWithURL(processUrl, isSync, modelData);

		this.setOnUI = oEvent.getSource().getProperty("setOnUI");
		this.labelCode = oEvent.getSource().getProperty("labelCode");
		//If invoked from a Table
		if (uiTableModel) {
			this.tableObj = {
				"dataModel": uiTableModel,
				"dataProperties": oEvent.getSource().getProperties(),
				"modelProperties": oEvent.getSource().getModelProperties(),
				"sPath": oEvent.getSource().getTableDataPath()
			};
		}

		var that = this;
		if (showDesc) {
			this.valueHelpDialog = new sap.m.SelectDialog({
				title: oEvent.getSource().getProperty("dialogTitle"),
				liveChange: function (liveChangeEvt) {
					that.searchHelp(liveChangeEvt);
				},
				close: function (closeEvt) {
					that.handleClose(closeEvt);
				},
				confirm: function (confirmEvt) {
					that.handleClose(confirmEvt);
					if (that.sourceType) {
						that.callBack(that.resultObj);
					}
				},
				items: {
					path: that.dataPath,
					template: new sap.m.StandardListItem().bindProperty("title", that.code).bindProperty("description", that.desc)
				}
			});
		} else {
			this.valueHelpDialog = new sap.m.SelectDialog({
				title: oEvent.getSource().getProperty("dialogTitle"),
				liveChange: function (liveChangeEvt) {
					that.searchHelp(liveChangeEvt);
				},
				close: function (closeEvt) {
					that.handleClose(closeEvt);
				},
				confirm: function (confirmEvt) {
					that.handleClose(confirmEvt);
					if (that.sourceType) {
						that.callBack(that.resultObj);
					}
				},
				items: {
					path: that.dataPath,
					template: new sap.m.StandardListItem().bindProperty("title", that.code)
				}
			});
		}

		this.valueHelpDialog.setModel(loadDataModel);
		this.valueHelpDialog.open();

		return loadDataModel.getData();
	},
	destroyValueHelp: function () {
		if (this.valueHelpDialog != null) {
			this.valueHelpDialog.destroy();
		}
	},

	searchHelp: function (oEvent) {
		var sValue = oEvent.getParameter("value");
		var oFilter = new sap.ui.model.Filter(this.desc, sap.ui.model.FilterOperator.Contains, sValue);
		var oFilter1 = new sap.ui.model.Filter(this.code, sap.ui.model.FilterOperator.Contains, sValue);
		var oBinding = oEvent.getSource().getBinding("items");
		oBinding.filter(new sap.ui.model.Filter([oFilter, oFilter1]), false);
	},

	handleClose: function (oEvent) {
		var aContexts = oEvent.getParameter("selectedContexts");
		var resultObj = {};
		if (aContexts.length) {
			aContexts.map(function (oContext) {
				resultObj = (oContext.getObject()) ? oContext.getObject() : {};
			});
		}

		if (resultObj) {
			if (this.tableObj) {
				var tempObj = this.tableObj;
				var bindingProp = tempObj.dataProperties;
				var modelProp = tempObj.modelProperties;
				if (bindingProp && modelProp) {
					bindingProp = bindingProp.split(",");
					modelProp = modelProp.split(",");
					if (bindingProp.length === modelProp.length) {
						var tableModel = tempObj.dataModel;
						var path = tempObj.sPath;
						for (var i = 0; i < bindingProp.length; i++) {
							tableModel.setProperty(path + "/" + bindingProp[i], resultObj[modelProp[i]]);
						}
					}
				}
			} else {
				var tempInput = sap.ui.getCore().byId(this.valueId);
				tempInput.setTooltip(resultObj[this.setOnUI]);
				tempInput.setValue(resultObj[this.setOnUI]);

				var tempLabelCode = sap.ui.getCore().byId(this.labelCode);
				if (tempLabelCode) {
					tempLabelCode.setText(resultObj[this.code]);
				}

			}
		}
		this.resultObj = resultObj;
	},

	createJSONModelWithURL: function (jsonURL, isSync, modelData) {
		var oModel = new sap.ui.model.json.JSONModel();
		if (modelData) {
			oModel.setData(modelData);
			// this.includeEmptyLineItem(oModel);
		} else {
			oModel.loadData(jsonURL, null, isSync);
		}

		// if (this.sourceType === "CC") {
		// 	var tempList = oModel.getProperty(this.dataPath);
		// 	if (tempList instanceof Array) {
		// 		for (var i = 0; i < tempList.length; i++) {
		// 			tempList[i].billAddress = (tempList[i].City) ? tempList[i].City + "\n" : "";
		// 			tempList[i].billAddress += (tempList[i].Street) ? tempList[i].Street + "\n" : "";
		// 			tempList[i].billAddress += (tempList[i].Postalcode) ? /*"Singapore-" + */ tempList[i].Postalcode + ", " : "";
		// 			tempList[i].billAddress += (tempList[i].Region) ? "Region-" + tempList[i].Region : "";
		// 		}
		// 	}
		// 	// oModel.setProperty(this.dataPath, approverList);
		// }

		var that = this;
		oModel.attachRequestCompleted(function () {
			// that.includeEmptyLineItem(oModel);
		});
		return oModel;

	},

	includeEmptyLineItem: function (oModel) {
		var tempList = oModel.getProperty(this.dataPath);
		var tempElement = {};
		tempElement[this.desc] = "";
		tempElement[this.code] = "";
		tempList.unshift(tempElement);
		oModel.setProperty(this.dataPath, tempList);
	}

});