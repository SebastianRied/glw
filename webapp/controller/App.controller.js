sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(Controller, JSONModel, Filter, FilterOperator) {
	'use strict';

	return Controller.extend('glw.controller.App', {

		onInit: function() {
		},

		onTilePress: function (oEvent) {
			var sId = oEvent.getSource().getId();
			var aIdParts = sId.split("-");
			sId = aIdParts.pop();
			var oRouter = this.getOwnerComponent().getRouter();
			switch (sId) {
				case "tileContainer": oRouter.navTo("containerList"); break;
				case "tileProductCategories": oRouter.navTo("productCategoriesList"); break;
				case "tileStorageBin": oRouter.navTo("storageBinsList"); break;
				case "tileGR": oRouter.navTo("goodsReceipt"); break;
				case "tileGM": oRouter.navTo("goodsMove"); break;
				case "tileGI": oRouter.navTo("goodsIssue"); break;
				case "tileStock": oRouter.navTo("stockList"); break;
				case "tileBatches": oRouter.navTo("batches"); break;
			}
		}
	});

});
