sap.ui.define([], function () {
	"use strict";
	var Template = function () {
		// the constructor must not be used.
		throw new Error();
	};

	var mTemplateGetter = {
		getStorageBinTemplate: function (/*oConfig*/) {
			return {
				_id: "",
				_rev: "",
				id: "",
				type: "storageBin"
			};
		},

		getContainerTemplate: function (/*oConfig*/) {
			return {
				_id: "",
				_rev: "",
				barCode: "",
				productCategory: "",
				storageBin: "",
				type: "container"
			};
		},

		getProductCategoryTemplate: function (/*oConfig*/) {
			return {
				_id: "",
				_rev: "",
				name: "",
				productGroup: "",
				volume: null,
				type: "productCategory"
			};
		},

		getBatchTemplate: function (/*oConfig*/) {
			return {
				_id: "",
				_rev: "",
				productCategory: "",
				batchDate: "",
				quantity: null,
				vol: null,
				distillerFee: null,
				taxes: null,
				otherCosts: null,
				type: "batch"
			};
		},

		getStockTemplate: function (/*oConfig*/) {
			return {
				_id: "",
				_rev: "",
				container: "",
				batch: "",
				quantity: null,
				type: "stock"
			};
		},

		getValidValuesTemplate: function () {
			return {
				_id: "validValues",
				type: "validValues",
				bool: {},
				productGroups: {},
				numberUnits: {}
			};
		},

		getLogTemplate: function () {
			return {
				container: null,
				storageBin: null,
				batch: null,
				quantity: 0,
				actionDate: "",
				action: "",
				type: "log"
			};
		}
	};

	Template.Type = {
		StorageBin: "StorageBin",
		Container: "Container",
		ProductCategory: "ProductCategory",
		Batch: "Batch",
		Stock: "Stock",
		Log: "Log"
	};
	Template.getTemplateFor = function (sType, oConfig) {
		sType = sType.charAt(0).toUpperCase() + sType.slice(1);
		var sTemplateGetterName = "get" + sType + "Template";
		if (typeof mTemplateGetter[sTemplateGetterName] === "function") {
			var oTemplate = mTemplateGetter[sTemplateGetterName].call(this, oConfig);
			Object.preventExtensions(oTemplate);
			return oTemplate;
		}
	};

	function getId(oObject) {
		if (typeof oObject === "object") {
			return oObject._id;
		} else {
			return oObject;
		}
	}

	var mForeignKey = {
		Container: ["productCategory", "storageBin"],
		Stock: ["container", "batch"],
		Log: ["batch", "storageBin", "container"]
	};

	Template.getDocument = function (sType, oObject) {
		sType = sType.charAt(0).toUpperCase() + sType.slice(1);
		var oDocument = this.getTemplateFor(sType);
		var aProperties = Object.getOwnPropertyNames(oDocument);
		for (var i = 0; i < aProperties.length; i++) {
			var sValue = oObject[aProperties[i]];
			if (mForeignKey[sType] && mForeignKey[sType].indexOf(aProperties[i]) >= 0) {
				sValue = getId(oObject[aProperties[i]]);
			}
			oDocument[aProperties[i]] = sValue;
		}
		return oDocument;
	};

	Template.getId = function (oObject) {
		return getId(oObject);
	};

	return Template;
});