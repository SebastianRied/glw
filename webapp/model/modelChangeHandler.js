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

	ChangeHandler.prototype.storageBinsModelChanged = function (oModel) {
		var mModels = this.models;
		Promise.all([mModels.container.loaded, mModels.storageBins.loaded]).then(function () {
			var mStorageBins = {};
			var aContainer = mModels.container.model.getObject("/rows");
			for (var i = 0; i < aContainer.length; i++) {
				mStorageBins[aContainer[i].value.storageBin] = true;
			}

			var aStorageBins = JSON.parse(JSON.stringify(mModels.storageBins.model.getObject("/rows")));
			for (var j = 0; j < aStorageBins.length; j++) {
				aStorageBins[j].value.used = mStorageBins[aStorageBins[j].value.id] || false;
			}

			mModels.storageBins.model.setProperty("/list", aStorageBins);
			mModels.storageBins.model.refresh(true);
		});
	};
/*
	ChangeHandler.prototype.stockModelChanged = function (oModel) {
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
	};*/

	return ChangeHandler;
});