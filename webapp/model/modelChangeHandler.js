sap.ui.define(["./documentTemplate"], function (template) {
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

	ChangeHandler.prototype.feedModelChanged = function (oModel, sUri) {
		var oData = oModel.getData();
		var oMainModel = this.getModel("main");
		var oMappedData = oMainModel.getData();
		var aRows = [];
		for (var i = 0; i < oData.results.length; i++) {
			aRows.push({value: oData.results[i].doc});
		}

		if (aRows.length > 0) {
			mapTypesToContainers(aRows, oMappedData);
			createDataRelationship(oMappedData);
			oMainModel.setData(oMappedData);
		}

		sUri = sUri.replace(/since=now/i, "since=" + oData.last_seq);
		oModel.loadData(sUri);
	};

	function mapTypesToContainers(aRows, oMappedData) {
		if (!aRows) {
			return;
		}
		// go throug the result set and put them with their ID into the corresponding type containers.
		var j;
		for (var i = 0; i < aRows.length; i++) {

			var oValue = undefined;
			if (!aRows[i].value._deleted) {
				oValue = aRows[i].value;
			}
			var sId = aRows[i].value._id;
			var sType = aRows[i].value.type;
			if (!sType) {
				sType = getTypeById(sId, oMappedData);
			}

			if (sType === "validValues") {
				oMappedData.validValues = oValue;
			} else if (sType && oMappedData["_" + sType]) {
				if (oValue && !oMappedData["_" + sType][sId]) {
					oMappedData[sType].push(oValue);
				} else if (oMappedData["_" + sType][sId]) {
					for (j = 0; j < oMappedData[sType].length; j++) {
						if (oMappedData[sType][j]._id === sId) {
							if (oValue) {
								oMappedData[sType].splice(j, 1, oValue);
							} else {
								oMappedData[sType].splice(j, 1);
							}

							break;
						}
					}
				}
				oMappedData["_" + sType]._length = oMappedData[sType].length || 0;
				if (oValue) {
					oMappedData["_" + sType][sId] = oValue;
				} else {
					delete oMappedData["_" + sType][sId];
				}
			}
		}
	}

	function getTypeById(sId, oMappedData) {
		var aProperties = Object.getOwnPropertyNames(oMappedData);
		for (var i = 0; i < aProperties.length; i++) {
			var sProperty = aProperties[i];
			if (sProperty[0] === "_" && oMappedData[sProperty][sId]) {
				return sProperty.split("_")[1];
			}
		}
	}

	function createDataRelationship(oMappedData, mFilter) {
		processProductGroup(oMappedData, mFilter);
		processProductCategory(oMappedData, mFilter);
		processStorageBin(oMappedData, mFilter);
		processContainer(oMappedData, mFilter);
		processBatch(oMappedData, mFilter);
		processStock(oMappedData, mFilter);
	}

	function processStorageBin(oMappedData, mFilter) {
		if (!oMappedData._storageBinIdReferences) {
			oMappedData._storageBinIdReferences = {};
		}

		for (var i = 0; i < oMappedData.storageBin.length; i++) {
			if (mFilter && !mFilter[oMappedData.storageBin[i]._id]) {
				continue;
			}
			var sId = oMappedData.storageBin[i].id;
			var sInternalId = oMappedData.storageBin[i]._id;
			oMappedData.storageBin[i].used = false;
			oMappedData._storageBinIdReferences[sId] = sInternalId;
		}
	}

	function processProductCategory(oMappedData, mFilter) {
		for (var i = 0; i < oMappedData.productCategory.length; i++) {
			var oCategory = oMappedData.productCategory[i];
			if (mFilter && !mFilter[oCategory._id]) {
				continue;
			}

			var sProductGroupId = typeof oCategory.productGroup === "string" ? oCategory.productGroup : oCategory.productGroup.id;
			oCategory.productGroup = oMappedData.validValues.productGroups[sProductGroupId];
		}
	}

	function processContainer(oMappedData, mFilter) {
		if (!oMappedData._containerIdReferences) {
			oMappedData._containerIdReferences = {};
		}
		for (var i = 0; i < oMappedData.container.length; i++) {
			var oContainer = oMappedData.container[i];
			if (mFilter && !mFilter[oContainer._id]) {
				continue;
			}

			var sId = oContainer.barCode;
			oMappedData._containerIdReferences[sId] = oContainer._id;
			// map the storage bin
			if (oContainer.storageBin) {
				var sStorageBinId = template.getId(oContainer.storageBin);

				sStorageBinInternalId = sStorageBinId;
				if (sStorageBinId.length < 32) {
					var sStorageBinInternalId = oMappedData._storageBinIdReferences[sStorageBinId];
				}

				if (oMappedData._storageBin[sStorageBinInternalId]) {
					oMappedData._storageBin[sStorageBinInternalId].used = true;
					oContainer.storageBin = oMappedData._storageBin[sStorageBinInternalId];

					if (!oMappedData._storageBin[sStorageBinInternalId].container) {
						oMappedData._storageBin[sStorageBinInternalId].container = []
					}
					oMappedData._storageBin[sStorageBinInternalId].container.push(oContainer);

				} else {
					oContainer.storageBin = {id: "#"};
				}
			}

			// map the product category
			if (oContainer.productCategory) {
				var sProductCategoryId = typeof oContainer.productCategory === "string" ? oContainer.productCategory : oContainer.productCategory._id;
				oContainer.productCategory = oMappedData._productCategory[sProductCategoryId];
			}

			// by default, every container is empty. When the stock is processed, this property will be updated.
			oContainer.empty = "yes";
		}
	}

	function processStock(oMappedData, mFilter) {
		oMappedData._stock._totalQuantity = 0;
		var oAggregatedStock = {};
		var oYears = {};
		oMappedData._aggregatedStock = {_length: 0};
		for (var i = 0; i < oMappedData.stock.length; i++) {
			var oStock = oMappedData.stock[i];


			var sContainerId = template.getId(oStock.container);
			var sInternalContainerId;
			if (sContainerId.length === 32) {
				// in older versions, the barCode was used to map the container to stock. For compatibility this is checked by assuming that the barCode has not
				// exactly 32 characters like the internal id
				sInternalContainerId = sContainerId;
			} else {
				sInternalContainerId = oMappedData._containerIdReferences[sContainerId];
			}

			if (oMappedData._container[sInternalContainerId]) {
				oMappedData._container[sInternalContainerId].empty = "no";
				oMappedData._stock._totalQuantity += oStock.quantity;
			} else {
				oStock._unkownContainer = true;
			}

			var sBatchId = typeof oStock.batch === "string" ? oStock.batch : oStock.batch._id;
			oStock.batch = oMappedData._batch[sBatchId];
			oStock.container = oMappedData._container[sInternalContainerId];

			// we need to aggregate the stock numbers for the overview page
			var sKey = oStock.batch.productCategory._id + "_" + oStock.batch.year;
			if (!oAggregatedStock[sKey]) {
				oMappedData._aggregatedStock._length++;
				var iBatchQuantity = parseFloat(oStock.batch.quantity);
				if (isNaN(iBatchQuantity)) {
					iBatchQuantity = 10000000;
				}

				oAggregatedStock[sKey] = {
					batch: oStock.batch,
					batchQuantity: iBatchQuantity,
					quantity: 0
				};
			}

			// for filtering the stock by year
			if (!oYears[oAggregatedStock[sKey].batch.year]) {
				oYears[oAggregatedStock[sKey].batch.year] = {year: oAggregatedStock[sKey].batch.year.toString()};
			}

			oAggregatedStock[sKey].quantity += oStock.quantity;
		}

		oMappedData.aggregatedStock = oAggregatedStock;
		oMappedData._stock.years = oYears;
	}

	function processProductGroup(oMappedData, mFilter) {
		if (!oMappedData.validValues || !oMappedData.validValues.productGroups) {
			return;
		}
		var oProductGroups = oMappedData.validValues.productGroups;
		var aProductGroupIds = Object.getOwnPropertyNames(oProductGroups);
		for (var i = 0; i < aProductGroupIds.length; i++) {
			if (mFilter && !mFilter[aProductGroupIds[i]]) {
				continue;
			}
			if (typeof oProductGroups[aProductGroupIds[i]].numberUnit === "string") {
				oProductGroups[aProductGroupIds[i]].numberUnit = oMappedData.validValues.numberUnits[oProductGroups[aProductGroupIds[i]].numberUnit];
			}
		}
	}

	function processBatch(oMappedData, mFilter) {
		for (var i = 0; i < oMappedData.batch.length; i++) {
			var oBatch = oMappedData.batch[i];
			if (mFilter && !mFilter[oBatch._id]) {
				continue;
			}

			if (oBatch.batchDate) {
				oBatch.batchDate = new Date(oBatch.batchDate);
				oBatch.year = oBatch.batchDate.getFullYear();
			}
			var sProductCategoryId = template.getId(oBatch.productCategory);
			oBatch.productCategory = oMappedData._productCategory[sProductCategoryId];
			oBatch.totalFee = oBatch.distillerFee + oBatch.taxes;
		}
	}

	ChangeHandler.prototype.mainModelChanged = function (oModel) {
		var oData = oModel.getData();
		var oMappedData = {
			_container: {_length: 0},
			_batch: {_length: 0},
			_stock: {_length: 0},
			_productCategory: {_length: 0},
			_storageBin:{_length: 0},
			_validValues: {_length: 0},
			container: [],
			batch: [],
			stock: [],
			productCategory: [],
			storageBin:[],
			validValues: []
		};

		mapTypesToContainers(oData.rows, oMappedData);
		createDataRelationship(oMappedData);

		oModel.setData(oMappedData);
	};

	return ChangeHandler;
});