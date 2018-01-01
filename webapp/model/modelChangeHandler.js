sap.ui.define(["./formatter"], function(Formatter) {
	"use strict";
	var ChangeHandler = function () {
		// the constructor must not be used. The ChangeHandler is a collection of event handlers called with the component context.
		throw new Error();
	};

	ChangeHandler.prototype.batchesModelChanged = function (oModel) {
		this.models.productCategories.loaded.then(function () {
			var aBatches = oModel.getObject("/rows");
			var aList = [];
			for (var i = 0; i < aBatches.length; i++) {
				var oObject = JSON.parse(JSON.stringify(aBatches[i].value));
				oObject.batchDate = new Date(oObject.batchDate);
				oObject.totalFee = oObject.distillerFee + oObject.taxes;
				oObject.productCategoryName = Formatter.formatProductCategory(oObject.productCategory, this.getModel("productCategories").getObject("/rows"));
				aList.push(oObject);
			}

			oModel.setProperty("/list", aList);
		}.bind(this));
	};

	return ChangeHandler;
});