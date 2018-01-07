sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/ValueState"
], function (Controller, Formatter, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, ValueState) {
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

			if (this._checkDeleteConditions(oContext.getProperty())) {
				oComponent.deleteDocument(oContext.getProperty("value")).then(fnHandler, fnHandler);
			} else {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					"Dieses Produkt wurde bereits eingelagert und kann daher nicht gelöscht werden.",
					{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},

		_checkDeleteConditions: function (oObject) {
			return !this.getOwnerComponent().findEntity("container", "/rows", function (oContainer) {
				return oObject.value._id === oContainer.value.productCategory;
			}) && !this.getOwnerComponent().findEntity("stock", "/list", function (oStock) {
					return oObject.value._id === oStock.batch.productCategory;
				});
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
					volume: {
						value: null,
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

			var oObject = oModel.getObject("/");
			var oInputField = this.byId("productCategoryInput");
			if (this._checkSaveConditions(oObject, oModel)) {
				var oValidValues = this.getView().getModel("validValues").getObject("/");
				var sProductGroupText = oValidValues.productGroups[oObject.productGroup.value].value;
				var oComponent = this.getOwnerComponent();
				oComponent.postDocument("productCategory", {
					name: oObject.productCategoryName.value,
					volume: oObject.volume.value,
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
			}
		},

		_checkSaveConditions: function (oObject, oModel) {
			oModel.setProperty("/productCategoryName/valueState", ValueState.None);
			oModel.setProperty("/productCategoryName/valueStateText", "");
			oModel.setProperty("/productGroup/valueState", ValueState.None);
			oModel.setProperty("/productGroup/valueStateText", "");
			var bReturn = true;

			if (!oObject.productCategoryName.value) {
				oModel.setProperty("/productCategoryName/valueState", ValueState.Error);
				oModel.setProperty("/productCategoryName/valueStateText", "Bitte einen Produktnamen eingeben");
				bReturn = false;
			}

			if (!oObject.productGroup.value) {
				oModel.setProperty("/productGroup/valueState", ValueState.Error);
				oModel.setProperty("/productGroup/valueStateText", "Bitte einen Produktnamen eingeben");
				bReturn = false;
			}

			// storageBinId must be unique
			if (this.getOwnerComponent().findEntity("productCategories", "/rows", function (oProductCategory) {
					return oObject.productCategoryName.value.toLowerCase() === oProductCategory.value.name.toLowerCase()
						&& oObject.productGroup.value === oProductCategory.value.productGroup;
				})) {
				oModel.setProperty("/productCategoryName/valueState", ValueState.Error);
				oModel.setProperty("/productCategoryName/valueStateText", "Ein Produkt mit dieser Bezeichnung existiert bereits.");
				bReturn = false;
			}

			return bReturn;
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
		}
	});

});
