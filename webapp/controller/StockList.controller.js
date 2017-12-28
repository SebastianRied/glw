sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/ui/core/ValueState"
], function (Controller, Formatter, History, JSONModel, Filter, FilterOperator, MessageToast, ValueState) {
	'use strict';

	return Controller.extend('glw.controller.StockList', {
		formatter: Formatter,
		onInit: function () {
			this.getOwnerComponent().getRouter().getRoute("stockListDetails").attachPatternMatched(this._onDisplayDetailsMatched.bind(this));
			this.getOwnerComponent().getRouter().getRoute("stockList").attachPatternMatched(this._onDisplayOverviewMatched.bind(this));
		},

		onNavBack: function () {
			var oRouter = this.getOwnerComponent().getRouter();
			var oIconTabBar = this.byId("idIconTabBar");

			if (oIconTabBar.getSelectedKey() === "details") {
				oRouter.navTo("stockList", {}, true);
			} else {
				oRouter.navTo("launchpad", {}, true);
			}
		},

		onIconTabBarSelect: function (oEvent) {
			var sKey = oEvent.getParameter("key");
			var oRouter = this.getOwnerComponent().getRouter();
			if (sKey === "details") {
				oRouter.navTo("stockListDetails", {}, true);
			} else {
				oRouter.navTo("stockList", {}, true);
			}
		},

		_onDisplayDetailsMatched: function (oEvent) {
			var sKey = oEvent.getParameter("arguments")["key*"];
			var aParts;
			if (sKey) {
				aParts = sKey.split("_");
			} else {
				aParts = [null, null];
			}

			var oIconTabBar = this.byId("idIconTabBar");
			oIconTabBar.setSelectedKey("details");

			// now filter the details list by using the facet filter.
			var oFacetFilter = this.byId("idFacetFilter");
			var aLists = oFacetFilter.getLists();
			var sValue;
			for (var i = 0; i < aLists.length; i++) {
				var sListKey = aLists[i].getKey();
				if (sListKey === "productCategory") {
					sValue = aParts[0];
				} else if (sListKey === "year") {
					sValue = aParts[1];
				} else {
					continue;
				}

				var aItems = aLists[i].getItems();
				for (var j = 0; j < aItems.length; j++) {
					if (aItems[j].getKey() === sValue) {
						aItems[j].setSelected(true);
					} else {
						aItems[j].setSelected(false);
					}
				}

				aLists[i].setActive(true);
			}

			if (sKey) {
				this.onConfirmFacetFilter();
			} else {
				this.onResetFacetFilter();
			}
		},

		_onDisplayOverviewMatched: function () {
			var oIconTabBar = this.byId("idIconTabBar");
			oIconTabBar.setSelectedKey("overview");
		},

		onSearchStockList: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._getTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue) {
				var fnGetFilter = function (vValue) {
					var iValue = parseInt(vValue, 10);
					if (!isNaN(iValue)) {
						if (iValue > 1000 && iValue < 10000) {
							return new Filter({path: "year", operator: FilterOperator.EQ, value1: iValue});
						}
					} else {
						return new Filter({
							path: "productCategoryName",
							operator: FilterOperator.Contains,
							value1: vValue
						});
					}
				};
				var aValues = sValue.split(" ");
				if (aValues.length > 1) {
					var aFilters = [];
					for (var i = 0; i < aValues.length; i++) {
						var oTempFilter = fnGetFilter(aValues[i]);
						if (oTempFilter) {
							aFilters.push(oTempFilter);
						}
					}
					oFilter = new Filter(aFilters, true);
				} else {
					oFilter = fnGetFilter(sValue);
				}
			}

			oBinding.filter(oFilter);
		},

		onSearchStockListDetails: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._getDetailsTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue) {
				var fnGetFilter = function (vValue) {
					var iValue = parseInt(vValue, 10);
					if (!isNaN(iValue)) {
						if (iValue > 1000 && iValue < 10000) {
							return new Filter({path: "value/year", operator: FilterOperator.EQ, value1: iValue});
						}
					} else {
						return new Filter({
							path: "value/productCategoryName",
							operator: FilterOperator.Contains,
							value1: vValue
						});
					}
				};
				var aValues = sValue.split(" ");
				if (aValues.length > 1) {
					var aFilters = [];
					for (var i = 0; i < aValues.length; i++) {
						var oTempFilter = fnGetFilter(aValues[i]);
						if (oTempFilter) {
							aFilters.push(oTempFilter);
						}
					}
					oFilter = new Filter(aFilters, true);
				} else {
					oFilter = fnGetFilter(sValue);
				}
			}

			this._stockListDetailsSearchFilters = oFilter;
			if (this._stockListDetailsFacetFilters) {
				if (oFilter) {
					oFilter = new Filter([oFilter, this._stockListDetailsFacetFilters], true);
				} else {
					oFilter = this._stockListDetailsFacetFilters;
				}
			}
			oBinding.filter(oFilter);
		},

		onConfirmFacetFilter: function () {
			var oFacetFilter = this.byId("idFacetFilter");
			this._filterModel(oFacetFilter);
		},

		_filterModel: function (oFacetFilter) {
			var mFacetFilterLists = oFacetFilter.getLists().filter(function (oList) {
				return oList.getSelectedItems().length;
			});

			if (mFacetFilterLists.length) {
				// Build the nested filter with ORs between the values of each group and
				// ANDs between each group
				var oFilter = new Filter(mFacetFilterLists.map(function (oList) {
					return new Filter(oList.getSelectedItems().map(function (oItem) {
						return new Filter("value/" + oList.getKey(), "EQ", oItem.getKey());
					}), false);
				}), true);
				this._applyFilter(oFilter);
			} else {
				this._applyFilter();
			}
		},

		_applyFilter: function (oFilter) {
			var oTable = this._getDetailsTable();
			this._stockListDetailsFacetFilters = oFilter;

			if (this._stockListDetailsSearchFilters) {
				if (oFilter) {
					oFilter = new Filter([oFilter, this._stockListDetailsSearchFilters], true);
				} else {
					oFilter = this._stockListDetailsSearchFilters;
				}
			}
			oTable.getBinding("items").filter(oFilter);
		},

		onResetFacetFilter: function () {
			var oFacetFilter = this.byId("idFacetFilter");
			var aFacetFilterLists = oFacetFilter.getLists();
			for (var i = 0; i < aFacetFilterLists.length; i++) {
				aFacetFilterLists[i].setSelectedKeys();
			}
			this._applyFilter([]);
		},

		handleListClose: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource().getParent();
			this._filterModel(oFacetFilter);
		},

		_getTable: function () {
			return this.byId("stockListTable");
		},

		_getDetailsTable: function () {
			return this.byId("stockListDetailsTable");
		},

		onItemPress: function (oEvent) {
			var oItem = oEvent.getParameter("listItem");
			var oContext = oItem.getBindingContext("stock");
			this.getOwnerComponent().getRouter().navTo("stockListDetails", {"key*": oContext.getPath().split("/").pop()});
		},
		onStockListBindingChange: function () {
			var oTable = this._getTable();
			var oBinding = oTable.getBinding("items");
			var aContext = oBinding.getContexts(0,oBinding.getLength());
			var iSum = 0;
			for (var i=0;i<aContext.length;i++){
				iSum += aContext[i].getProperty("quantity");
			}
			this.getView().getModel("stock").setProperty("/filteredQuantity", Math.round10(iSum, -2));
		},
		onStockListDetailsBindingChange: function () {
			var oTable = this._getDetailsTable();
			var oBinding = oTable.getBinding("items");
			var aContext = oBinding.getContexts(0,oBinding.getLength());
			var iSum = 0;
			for (var i=0;i<aContext.length;i++){
				iSum += aContext[i].getProperty("value/quantity");
			}
			this.getView().getModel("stock").setProperty("/filteredQuantity", Math.round10(iSum, -2));
		}
	});

});
