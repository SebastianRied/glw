sap.ui.define([
	"./BaseController"
], function(Controller) {
	'use strict';

	return Controller.extend('glw.controller.App', {
		onTilePress: function (oEvent) {
			this.getRouter().navTo(oEvent.getSource().data("navTarget"));
		},

		onLogin: function () {
			this.getRouter().navTo("launchpad");
		},

		onLogout: function () {
			this.getRouter().navTo("logout");
		}
	});
});
