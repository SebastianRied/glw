sap.ui.define(["sap/ui/core/format/DateFormat"], function(DateFormat) {
	"use strict";
	var Formatter = function() {
		// the constructor must not be used. The formatter is a collection of static formatting functions
		throw new Error();
	};

	function formatAll(fnFormatter, aArguments, fnMap) {
		var aReturnValues = [];
		var mValue;
		for (var i = 0; i < aArguments.length; i++) {
			mValue = aArguments[i];
			try {
				// In case something goes wrong, no value will be pushed
				if (fnMap) {
					mValue = fnMap(aArguments[i]);
				}
				aReturnValues.push(fnFormatter(mValue));
			} catch (e) { /*no handler*/ }
		}
		return aReturnValues;
	}

	function getDate(mValue) {
		var oDate = new Date(mValue.replace(" ", "T") + "Z");
		if (isNaN(oDate.getTime())) {
			oDate = undefined;
		}
		return oDate;
	}

	function getDateFormatter(fnFormatter) {
		return function(oDate) {
			if (oDate) {
				return fnFormatter(oDate);
			} else {
				return "";
			}
		}
	}
	/**
	 * Formats a timestamp of any string representation which is compatible with the
	 * JS Date constructor into a string representation of a date, based on the users locale.
	 * @param {String} sValue timestamp
	 * @return {String} Date representation based on users locale
	 *
	 * The complete arguments list will be formatted and concatenated with ", "
	 */
	Formatter.formatDate = function( /*arguments*/ ) {
		var oFormat = DateFormat.getDateInstance({
			pattern: "dd.MM.yyyy"
		});
		return formatAll(getDateFormatter(oFormat.format.bind(oFormat)), arguments, getDate).join(", ");
	};

	Formatter.formatDateTime = function( /*arguments*/ ) {
		var oFormat = DateFormat.getDateTimeInstance({
			pattern: "dd.MM.yyyy - HH:mm"
		});
		return formatAll(getDateFormatter(oFormat.format.bind(oFormat)), arguments, getDate).join(", ");
	};

	Formatter.formatTimeString = function( /*arguments*/ ) {
		var fnFormatter = function(sValue) {
			if (sValue && sValue.length === 3) {
				sValue = "0" + sValue;
			}

			if (sValue) {
				return sValue.substring(0, 2) + ":" + sValue.substring(2);
			}
			return sValue;
		};

		return formatAll(fnFormatter, arguments).join(", ");
	};

	Formatter.formatTrueIfNotEmpty = function() {
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i]) {
				return true;
			}
		}
		return false;
	};

	Formatter.formatTrueIfEmpty = function() {
		var bValueFound = false;
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i]) {
				bValueFound = true;
			}
		}
		return !bValueFound;
	};

	Formatter.formatTrueIfAnyTrue = function () {
		var bValueFound = false;
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i] === true || arguments[i] === "true" || arguments[i] === "Y") {
				bValueFound = true;
				break;
			}
		}
		return bValueFound;
	};

	Formatter.formatValidValue = function(sValue, mValidValues) {
		if (sValue !== undefined && mValidValues !== undefined && !jQuery.isArray(mValidValues)) {
			return mValidValues[sValue].value;
		} else {
			return "";
		}
	};

	Formatter.formatMessage = function (sPattern) {
		var aValues = [];
		for (var i = 1; i < 10; i++) {
			var sValue = arguments[i];
			if (sValue === undefined) {
				sValue = "";
			}
			aValues.push(sValue);
		}

		return jQuery.sap.formatMessage(sPattern, aValues);
	};

	Formatter.formatInteger = function (vValue) {
		return parseInt(vValue || 0, 10);
	};

	Formatter.formatNewLine = function () {
		return Array.prototype.slice.call(arguments).filter(function (v) {
			return !!v;
		}).join("\n");
	};

	Formatter.formatNumberUnitByProductGroupId = function (sProductGroupId, oValidValues) {
		if (sProductGroupId && oValidValues) {
			var sNumberUnitId = oValidValues.productGroups[sProductGroupId].numberUnit;
			return oValidValues.numberUnits[sNumberUnitId].value || "";
		} else {
			return "";
		}
	};

	Formatter.formatFinishingByProductGroupId = function (sProductGroupId, oValidValues) {
		if (sProductGroupId && oValidValues && oValidValues.productGroups[sProductGroupId] && oValidValues.productGroups[sProductGroupId].finishing) {
			return "Ja";
		} else {
			return "Nein";
		}
	};

	Formatter.formatFinishingByProductCategoryId = function (sProductCategoryId, aProductCategories, oValidValues) {
		if (jQuery.isArray(aProductCategories)) {
			for (var i = 0; i < aProductCategories.length; i++) {
				if (aProductCategories[i].id === sProductCategoryId) {
					var sProductGroup = aProductCategories[i].value.productGroup;
					return Formatter.formatFinishingByProductGroupId(sProductGroup, oValidValues);
				}
			}
		}

		return "No";
	};

	Formatter.formatProductGroupByProductCategoryId = function (sProductCategoryId, aProductCategories, oValidValues) {
		if (jQuery.isArray(aProductCategories)) {
			for (var i = 0; i < aProductCategories.length; i++) {
				if (aProductCategories[i].id === sProductCategoryId) {
					var sProductGroup = aProductCategories[i].value.productGroup;
					return oValidValues.productGroups[sProductGroup].value || "";
				}
			}
		}

		return sProductCategoryId;
	};

	Formatter.formatNumberUnitByProductCategoryId = function (sProductCategoryId, aProductCategories, oValidValues) {
		if (jQuery.isArray(aProductCategories)) {
			for (var i = 0; i < aProductCategories.length; i++) {
				if (aProductCategories[i].id === sProductCategoryId) {
					var sProductGroup = aProductCategories[i].value.productGroup;
					return Formatter.formatNumberUnitByProductGroupId(oValidValues.productGroups[sProductGroup].id, oValidValues);
				}
			}
		}

		return "";
	};

	Formatter.formatProductCategory = function (sProductCategoryId, aProductCategories) {
		if (jQuery.isArray(aProductCategories)) {
			for (var i = 0; i < aProductCategories.length; i++) {
				if (aProductCategories[i].id === sProductCategoryId) {
					return aProductCategories[i].value.name;
				}
			}
		}

		return sProductCategoryId;
	};

	Formatter.formatProductCategoryByContainerBarCode = function (sContainerBarCode, aContainers, aProductCategories) {
		if (jQuery.isArray(aContainers)) {
			for (var i = 0; i < aContainers.length; i++) {
				if (aContainers[i].value.barCode === sContainerBarCode) {
					return Formatter.formatProductCategory(aContainers[i].value.productCategory, aProductCategories);
				}
			}
		}

		return "";
	};

	Formatter.formatContainerVolume = function (sContainerBarCode, aContainers) {
		if (jQuery.isArray(aContainers)) {
			for (var i = 0; i < aContainers.length; i++) {
				if (aContainers[i].value.barCode === sContainerBarCode) {
					return aContainers[i].value.volume || "";
				}
			}
		}

		return "";
	};

	Formatter.formatStorageBinByContainerBarCode = function (sContainerBarCode, aContainers) {
		if (jQuery.isArray(aContainers)) {
			for (var i = 0; i < aContainers.length; i++) {
				if (aContainers[i].value.barCode === sContainerBarCode) {
					return aContainers[i].value.storageBin;
				}
			}
		}

		return "";
	};

	Formatter.formatStockListCriticalQuantity = function (sValue, iBatchQuantity) {
		if (parseFloat(sValue) <= (iBatchQuantity / 5)) {
			return sap.ui.core.MessageType.Error;
		} else if (parseFloat(sValue) <= (iBatchQuantity / 2.5)) {
			return sap.ui.core.MessageType.Warning;
		} else {
			return sap.ui.core.MessageType.Success;
		}
	};

	Formatter.sum = function () {
		var iSum = 0;
		for (var i = 0; i < arguments.length; i++) {
			var iSum2 = parseFloat(arguments[i]);
			if (isNaN(iSum2)) {
				iSum2 = 0;
			}
			iSum += iSum2;
		}
		return iSum;
	};

	return Formatter;
});