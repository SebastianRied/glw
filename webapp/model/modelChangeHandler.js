sap.ui.define(["./formatter"], function (Formatter) {
	"use strict";
	var ChangeHandler = function () {
		// the constructor must not be used. The ChangeHandler is a collection of event handlers called with the component context.
		throw new Error();
	};

	function getBatchListItem(oBatchRow, aProductCategories) {
		var oObject = JSON.parse(JSON.stringify(oBatchRow.value));
		oObject.batchDate = new Date(oObject.batchDate);
		oObject.totalFee = oObject.distillerFee + oObject.taxes;
		oObject.productCategoryName = Formatter.formatProductCategory(oObject.productCategory, aProductCategories);
		return oObject;
	}

	ChangeHandler.prototype.batchesModelChanged = function (oModel) {
		this.models.productCategories.loaded.then(function () {
			var aBatches = oModel.getObject("/rows");
			var aList = [];
			var aProductCategories = this.getModel("productCategories").getObject("/rows");
			for (var i = 0; i < aBatches.length; i++) {
				aList.push(getBatchListItem.call(this, aBatches[i], aProductCategories));
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
		});
	};

	ChangeHandler.prototype.containerModelChanged = function () {
		ChangeHandler.prototype.stockModelChanged.call(this, this.getModel("stock"));
		ChangeHandler.prototype.storageBinsModelChanged.call(this, this.getModel("storageBins"));
	};

	ChangeHandler.prototype.stockModelChanged = function (oModel) {
		Promise.all([this.models.stock.loaded, this.models.productCategories.loaded, this.models.batches.loaded, this.models.container.loaded, this.models.validValues.loaded]).then(function() {
			var aBatches = this.models.batches.model.getObject("/rows");
			var mBatches = {};
			var aProductCategories = this.models.productCategories.model.getObject("/rows");
			var aContainer = this.getModel("container").getObject("/rows");
			for (var i = 0; i < aBatches.length; i++) {
				mBatches[aBatches[i].value._id] = getBatchListItem.call(this, aBatches[i], aProductCategories);
			}

			var aStock = oModel.getObject("/rows");
			var aList = [];
			var oAggregatedStock = {};
			var oYears = {};
			var iTotal = 0;
			var oValidValues = this.models.validValues.model.getObject("/");
			for (var j = 0; j < aStock.length; j++) {
				var oStock = aStock[j].value;
				var oObject = JSON.parse(JSON.stringify(oStock));
				oObject.batch = mBatches[oStock.batch];
				if (!oObject.batch) {
					continue;
				}
				oObject.productCategoryName = Formatter.formatProductCategory(oObject.batch.productCategory, aProductCategories);
				oObject.containerName = Formatter.formatProductCategoryByContainerBarCode(oStock.container, aContainer, aProductCategories);
				oObject.storageBin = Formatter.formatStorageBinByContainerBarCode(oStock.container, aContainer);
				oObject.year = oObject.batch.batchDate.getFullYear();
				oObject.numberUnit = Formatter.formatNumberUnitByProductCategoryId(oObject.batch.productCategory, aProductCategories, oValidValues);

				// aggregted stock calculation
				var sKey = oObject.batch.productCategory + "_" + oObject.year;
				if (!oAggregatedStock[sKey]) {
					oAggregatedStock[sKey] = {
						productCategory: oObject.batch.productCategory,
						productCategoryName: oObject.productCategoryName,
						batchDate: oObject.batch.batchDate,
						year: oObject.year,
						quantity: 0,
						numberUnit: oObject.numberUnit
					};
				}

				if (!oYears[oAggregatedStock[sKey].year]) {
					oYears[oAggregatedStock[sKey].year] = {year: oAggregatedStock[sKey].year};
				}

				oAggregatedStock[sKey].quantity += oStock.quantity;
				iTotal += oStock.quantity;
				oModel.setProperty("/aggregatedStock", oAggregatedStock);
				this.getModel("viewModel").setProperty("/totalQuantity", iTotal);
				oModel.setProperty("/years", oYears);
				oModel.setProperty("/totalCount", Object.getOwnPropertyNames(oAggregatedStock).length);


				aList.push(oObject);
			}

			oModel.setProperty("/list", aList);
			oModel.refresh(true);
		}.bind(this));
	};

	return ChangeHandler;
});