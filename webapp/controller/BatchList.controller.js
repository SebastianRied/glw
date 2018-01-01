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

	return Controller.extend('glw.controller.BatchList', {
		formatter: Formatter,
		onInit: function () {

		},

		onNavBack: function () {
			this.getOwnerComponent().onNavBack();
		},

		onDeleteStorageBinPress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("storageBins");
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show("Der Lagerplatz '" + oContext.getProperty("value/id") + "' wurde gelöscht", {
						width: "30rem",
						duration: 2000
					});
					oComponent.reloadModel("storageBins");
				} else {
					MessageToast.show(oResponse.errorText, {
						width: "30rem",
						duration: 2000
					});
				}
			};

			if (this._checkDeleteConditions(oContext.getProperty())) {
				oComponent.deleteDocument(oContext.getProperty("value")).then(fnHandler, fnHandler);
			} else {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					"Der Lagerplatz wird noch von mindestens einem Behälter belegt",
					{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},

		_checkDeleteConditions: function (oObject) {
			return !this.getOwnerComponent().findEntity("container", "/rows", function (oContainer) {
				return oObject.value.id === oContainer.value.storageBin;
			});
		},

		onOpenAddBatchDialogPress: function () {
			var oView = this.getView();
			var oDialog = this._getAddDialog();
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.BatchAddDialog", this);
				oView.addDependent(oDialog);
				var oModel = new JSONModel();
				oDialog.setModel(oModel);
			}
			oModel.setData({
				productCategory: {
					value: "",
					valueState: ValueState.None,
					valueStateText: ""
				},
				batchDate: {
					value: new Date(),
					valueState: ValueState.None,
					valueStateText: ""
				},
				quantity: {
					value: null,
					valueState: ValueState.None,
					valueStateText: ""
				},
				vol: {
					value: null,
					valueState: ValueState.None,
					valueStateText: ""
				},
				distillerFee: {
					value: null,
					valueState: ValueState.None,
					valueStateText: ""
				},
				taxes: {
					value: null,
					valueState: ValueState.None,
					valueStateText: ""
				}
			});

			oDialog.open();
		},

		onCancelAddBatchDialogPress: function () {
			var oDialog = this._getAddDialog();
			oDialog.close();
		},

		onSaveNewBatchPress: function () {
			var oDialog = this._getAddDialog();
			var oModel = oDialog.getModel();

			var oObject = oModel.getObject("/");

			if (this._checkSaveConditions(oObject, oModel)) {
				var oComponent = this.getOwnerComponent();
				oComponent.postDocument("batch", {
					productCategory: oObject.productCategory.value,
					batchDate: oObject.batchDate.value,
					quantity: oObject.quantity.value,
					vol: oObject.vol.value,
					distillerFee: oObject.distillerFee.value,
					taxes: oObject.taxes.value
				}).then(function (oResponse) {
					if (oResponse.response.ok) {
						MessageToast.show("Charge wurde angelegt", {
							width: "30rem",
							duration: 2000
						});

						oComponent.reloadModel("batches");
						oDialog.close();
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
			var aProperties = Object.getOwnPropertyNames(oObject);
			// reset value states and value stateTexts before performing the check
			for (var i = 0; i < aProperties.length; i++) {
				oModel.setProperty("/" + aProperties[i] + "/valueState", ValueState.None);
				oModel.setProperty("/" + aProperties[i] + "/valueStateText", "");
			}

			var bReturn = true;
			// productCategory must not be empty
			if (!oObject.productCategory.value) {
				oModel.setProperty("/productCategory/valueState", ValueState.Error);
				oModel.setProperty("/productCategory/valueStateText", "Bitte Produkt auswählen");
				bReturn = false;
			}

			if (!oObject.batchDate.value) {
				oModel.setProperty("/batchDate/valueState", ValueState.Error);
				oModel.setProperty("/batchDate/valueStateText", "Bitte ein Chargendatum angeben");
				bReturn = false;
			}

			if (!oObject.quantity.value) {
				oModel.setProperty("/quantity/valueState", ValueState.Error);
				oModel.setProperty("/quantity/valueStateText", "Bitte eine Menge angeben");
				bReturn = false;
			}

			if (!oObject.vol.value) {
				oModel.setProperty("/vol/valueState", ValueState.Error);
				oModel.setProperty("/vol/valueStateText", "Bitte den Alkoholgehalt angeben");
				bReturn = false;
			}

			if (!oObject.distillerFee.value) {
				oModel.setProperty("/distillerFee/valueState", ValueState.Error);
				oModel.setProperty("/distillerFee/valueStateText", "Bitte Brennerlohn angeben");
				bReturn = false;
			}

			if (!oObject.taxes.value) {
				oModel.setProperty("/taxes/valueState", ValueState.Error);
				oModel.setProperty("/taxes/valueStateText", "Bitte Steuern  angeben");
				bReturn = false;
			}

			return bReturn;
		},

		_getAddDialog: function () {
			return this.byId("BatchAddDialog");
		},

		onSearchBatch: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._getTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue) {
				oFilter = new Filter({path: "value/id", operator: FilterOperator.Contains, value1: sValue});
			}

			oBinding.filter(oFilter);
		},

		_getTable: function () {
			return this.byId("batchTable");
		}
	});

});
