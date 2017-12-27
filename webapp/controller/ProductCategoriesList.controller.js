sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/ui/core/ValueState"
], function (Controller, Formatter, JSONModel, Filter, FilterOperator, MessageToast, ValueState) {
	'use strict';

	return Controller.extend('glw.controller.ProductCategoriesList', {
		formatter: Formatter,
		onInit: function () {

		},

		onNavBack: function () {
			this.getOwnerComponent().onNavBack();
		},

		onDeleteProductCategoryPress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("productCategories");
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show("Das Produkt '" + oContext.getProperty("value/name") + "' wurde gelöscht", {
						width: "30rem",
						duration: 2000
					});
					oComponent.reloadModel("productCategories");
				} else {
					MessageToast.show(oResponse.errorText, {
						width: "30rem",
						duration: 2000
					});
				}};
			oComponent.deleteDocument(oContext.getProperty("value")).then(fnHandler, fnHandler);
		},

		onOpenAddProductDialogPress: function () {
			var oView = this.getView();
			var oDialog = this._getAddDialog();
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.ProductCategoryAddDialog", this);
				oView.addDependent(oDialog);
				var oModel = new JSONModel();
				oModel.setData({
					productCategoryName: {
						value: "",
						valueState: ValueState.None,
						valueStateText: ""
					},
					productGroup: {
						value: "",
						valueState: ValueState.None,
						valueStateText: ""
					}
				});
				oDialog.setModel(oModel);
			}
			oDialog.open();
		},

		onCancelAddProductDialogPress: function () {
			var oDialog = this._getAddDialog();
			oDialog.close();
		},

		onSaveNewProductPress: function () {
			var oDialog = this._getAddDialog();
			var oModel = oDialog.getModel();
			oModel.setProperty("/productCategoryName/valueState", ValueState.None);
			oModel.setProperty("/productCategoryName/valueStateText", "");
			oModel.setProperty("/productGroup/valueState", ValueState.None);
			oModel.setProperty("/productGroup/valueStateText", "");
			var oObject = oModel.getObject("/");
			var oInputField = this.byId("productCategoryInput");
			if (oObject.productCategoryName.value && oObject.productGroup.value) {
				var oValidValues = this.getView().getModel("validValues").getObject("/");
				var sProductGroupText = oValidValues.productGroups[oObject.productGroup.value].value;
				var oComponent = this.getOwnerComponent();
				oComponent.postDocument("productCategory", {
					name: oObject.productCategoryName.value,
					productGroup: oObject.productGroup.value
				}).then(function (oResponse) {
					if (oResponse.response.ok) {
						MessageToast.show("Produkt '" + oObject.productCategoryName.value + "' wurde in der Produktgruppe '" + sProductGroupText + "' angelegt", {
							width: "30rem",
							duration: 2000
						});
						oModel.setProperty("/productCategoryName/value", "");
						oComponent.reloadModel("productCategories");
						oInputField.focus();
					} else {
						MessageToast.show(oResponse.errorText, {
							width: "30rem",
							duration: 2000
						});
					}
				});

			} else {
				if (!oObject.productCategoryName.value) {
					oModel.setProperty("/productCategoryName/valueState", ValueState.Error);
					oModel.setProperty("/productCategoryName/valueStateText", "Bitte einen Produktnamen eingeben");
				}

				if (!oObject.productGroup.value) {
					oModel.setProperty("/productGroup/valueState", ValueState.Error);
					oModel.setProperty("/productGroup/valueStateText", "Bitte einen Produktnamen eingeben");
				}
			}
		},

		_getAddDialog: function () {
			return this.byId("ProductCategoryAddDialog");

		},
		onSearchProductCategory: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._getTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue) {
				oFilter = new Filter({path: "value/name", operator: FilterOperator.Contains, value1: sValue});
			}

			oBinding.filter(oFilter);
		},

		_getTable: function () {
			return this.byId("productCategoryTable");
		},
	});

});
