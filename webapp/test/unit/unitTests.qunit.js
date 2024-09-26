/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"nus/edu/sg/claimrequest/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});