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

	return Controller.extend('glw.controller.StorageBinsList', {
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

		onOpenAddStorageBinDialogPress: function () {
			var oView = this.getView();
			var oDialog = this._getAddDialog();
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.StorageBinAddDialog", this);
				oView.addDependent(oDialog);
				var oModel = new JSONModel();
				oModel.setData({
					storageBinId: {
						value: "",
						valueState: ValueState.None,
						valueStateText: ""
					}
				});
				oDialog.setModel(oModel);
			}
			oDialog.open();
		},

		onCancelAddStorageBinDialogPress: function () {
			var oDialog = this._getAddDialog();
			oDialog.close();
		},

		onSaveNewStorageBinPress: function () {
			var oDialog = this._getAddDialog();
			var oModel = oDialog.getModel();

			var oObject = oModel.getObject("/");

			if (this._checkSaveConditions(oObject, oModel)) {
				var oComponent = this.getOwnerComponent();
				oComponent.postDocument("storageBin", {
					id: oObject.storageBinId.value
				}).then(function (oResponse) {
					if (oResponse.response.ok) {
						MessageToast.show("Lagerplatz '" + oObject.storageBinId.value + "' wurde angelegt", {
							width: "30rem",
							duration: 2000
						});
						oModel.setProperty("/storageBinId/value", "");
						oComponent.reloadModel("storageBins");
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
			oModel.setProperty("/storageBinId/valueState", ValueState.None);
			oModel.setProperty("/storageBinId/valueStateText", "");
			var bReturn = true;
			// storageBinId must not be empty
			if (!oObject.storageBinId.value) {
				oModel.setProperty("/storageBinId/valueState", ValueState.Error);
				oModel.setProperty("/storageBinId/valueStateText", "Bitte eine Lagerplatznummer eingeben");
				bReturn = false;
			}

			// storageBinId must be unique
			if (this.getOwnerComponent().findEntity("storageBins", "/rows", function (oStorageBin) {
					return oObject.storageBinId.value === oStorageBin.value.id;
				})) {
				oModel.setProperty("/storageBinId/valueState", ValueState.Error);
				oModel.setProperty("/storageBinId/valueStateText", "Die Lagerplatznummer existiert bereits");
				bReturn = false;
			}

			return bReturn;
		},

		_getAddDialog: function () {
			return this.byId("StorageBinAddDialog");
		},

		onSearchStorageBin: function (oEvent) {
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
			return this.byId("storageBinTable");
		}
	});

});
