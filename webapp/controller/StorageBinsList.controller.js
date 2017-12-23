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
				}};
			oComponent.deleteDocument(oContext.getProperty("value")).then(fnHandler, fnHandler);
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
			oModel.setProperty("/storageBinId/valueState", ValueState.None);
			oModel.setProperty("/storageBinId/valueStateText", "");
			var oObject = oModel.getObject("/");
			if (oObject.storageBinId.value) {
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

			} else {
				oModel.setProperty("/storageBinId/valueState", ValueState.Error);
				oModel.setProperty("/storageBinId/valueStateText", "Bitte eine Lagerplatznummer eingeben");
			}
		},

		_getAddDialog: function () {
			return this.byId("StorageBinAddDialog");
		}
	});

});
