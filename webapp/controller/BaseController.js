sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/documentTemplate",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/routing/History"
], function(Controller, documentTemplate, Filter, FilterOperator, History) {
	'use strict';

	return Controller.extend('glw.BaseController', {
		template: documentTemplate,
		getRouter: function () {
			this._router = this._router || this.getOwnerComponent().getRouter();
			return this._router;
		},

		onNavBack: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("launchpad", {}, true);
			}
		},

		focusControl: function (sId) {
			var oView = this.getView();
			// set the initial focus to the search field.
			// This allows to use a bar code scanner right away, without setting the focus manually.
			oView.attachAfterRendering(function () {
				window.setTimeout(function () {
					var oSearchField = oView.byId(sId);
					if (oSearchField) {
						oSearchField.focus();
					}
				}, 0);
			});
		},

		getText: function (sKey) {
			if (!this._resourceBundle) {
				this._resourceBundle = this.getModel("i18n").getResourceBundle();
			}
			return this._resourceBundle && this._resourceBundle.getText(sKey, Array.prototype.slice.call(arguments, 1));
		},

		getModel: function () {
			var oView = this.getView();
			return oView.getModel.apply(oView, arguments);
		},

		onSearchTable: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._getTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue && this.filterProperties) {
				var aFilters = [];
				for (var i = 0; i < this.filterProperties.length; i++) {
					aFilters.push(new Filter({path: this.filterProperties[i], operator: FilterOperator.Contains, value1: sValue}));
				}

				if (aFilters.length > 1) {
					oFilter = new Filter(aFilters, false);
				} else if (aFilters.length === 1) {
					oFilter = aFilters[0];
				}
			}

			this._searchFilters = oFilter;
			if (this._facetFilters) {
				if (oFilter) {
					oFilter = new Filter([oFilter, this._facetFilters], true);
				} else {
					oFilter = this._facetFilters;
				}
			}

			oBinding.filter(oFilter);
		},

		onConfirmFacetFilter: function (oEvent) {
			this._filterModel(oEvent.getSource());
		},

		onResetFacetFilter: function (oEvent) {
			var oFacetFilter = oEvent.getSource();
			var aFacetFilterLists = oFacetFilter.getLists();
			for (var i = 0; i < aFacetFilterLists.length; i++) {
				aFacetFilterLists[i].setSelectedKeys();
			}
			this._applyFilter();
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
						return new Filter(oList.getKey(), "EQ", oItem.getKey());
					}), false);
				}), true);
				this._applyFilter(oFilter);
			} else {
				this._applyFilter();
			}
		},

		_applyFilter: function (oFilter) {
			var oTable = this._getTable();
			this._facetFilters = oFilter;

			if (this._searchFilters) {
				if (oFilter) {
					oFilter = new Filter([oFilter, this._searchFilters], true);
				} else {
					oFilter = this._searchFilters;
				}
			}
			oTable.getBinding("items").filter(oFilter);
		},

		compareStringAsInt: function () {
			return this.getOwnerComponent().compareStringAsInt.apply(this, arguments);
		}
	});

});
