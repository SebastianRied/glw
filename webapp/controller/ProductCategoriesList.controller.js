sap.ui.define([
	"./BaseController",
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
		filterProperties: ["name"],
		onInit: function () {
			this.focusControl("searchField");
		},

		onDeleteProductCategoryPress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("main");
			var that = this;
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show(that.getText("messageDeleted", that.getText("product"), oContext.getProperty("name")), {
						width: "30rem",
						duration: 2000
					});
				} else {
					MessageToast.show(oResponse.errorText, {
						width: "30rem",
						duration: 2000
					});
				}};

			if (this._checkDeleteConditions(oContext.getProperty())) {
				oComponent.deleteDocument(oContext.getProperty()).then(fnHandler, fnHandler);
			} else {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					that.getText("messageProductInStock"),
					{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},

		_checkDeleteConditions: function (oObject) {
			return !this.getOwnerComponent().findEntity("main", "/container", function (oContainer) {
				return oObject._id === oContainer.productCategory._id;
			}) && !this.getOwnerComponent().findEntity("main", "/stock", function (oStock) {
					return oObject._id === oStock.batch.productCategory._id;
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
				var oValidValues = this.getView().getModel("main").getObject("/validValues");
				var sProductGroupText = oValidValues.productGroups[oObject.productGroup.value].value;
				var oComponent = this.getOwnerComponent();
				oComponent.postDocument("productCategory", this.template.getDocument("productCategory", {
					name: oObject.productCategoryName.value,
					volume: oObject.volume.value,
					productGroup: oObject.productGroup.value
				})).then(function (oResponse) {
					if (oResponse.response.ok) {
						MessageToast.show("Produkt '" + oObject.productCategoryName.value + "' wurde in der Produktgruppe '" + sProductGroupText + "' angelegt", {
							width: "30rem",
							duration: 2000
						});
						oModel.setProperty("/productCategoryName/value", "");
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
			if (this.getOwnerComponent().findEntity("main", "/productCategory", function (oProductCategory) {
					return oObject.productCategoryName.value.toLowerCase() === oProductCategory.name.toLowerCase()
						&& oObject.productGroup.value === oProductCategory.productGroup;
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

		_getTable: function () {
			return this.byId("productCategoryTable");
		}
	});

});
