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

	return Controller.extend('glw.controller.ContainerList', {
		formatter: Formatter,
		onInit: function () {

		},

		onNavBack: function () {
			this.getOwnerComponent().onNavBack();
		},

		onDelete: function (oEvent) {
			oEvent.getSource().removeAggregation("items", oEvent.getParameter("listItem"));
			MessageToast.show("Delete: " + oEvent.getParameter("listItem").getId());
		},

		onOpenAddContainerDialogPress: function () {
			var oView = this.getView();
			var oDialog = this._getAddDialog();
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.ContainerAddDialog", this);
				oView.addDependent(oDialog);
				var oModel = new JSONModel();
				oModel.setData({
					containerBarCode: {
						value: null,
						valueState: ValueState.None,
						valueStateText: ""
					},
					productCategory: {
						value: null,
						valueState: ValueState.None,
						valueStateText: ""
					},
					storageBin: {
						value: "",
						valueState: ValueState.None,
						valueStateText: ""
					}
				});
				oDialog.setModel(oModel);
			}
			oDialog.open();
		},

		onSaveNewContainerPress: function () {
			var oDialog = this._getAddDialog();
			var oModel = oDialog.getModel();
			oModel.setProperty("/containerBarCode/valueState", ValueState.None);
			oModel.setProperty("/containerBarCode/valueStateText", "");
			oModel.setProperty("/productCategory/valueState", ValueState.None);
			oModel.setProperty("/productCategory/valueStateText", "");

			var oObject = oModel.getObject("/");
			oObject.containerBarCode.value = jQuery.trim(oObject.containerBarCode.value);
			if (oObject.containerBarCode.value && oObject.productCategory.value) {
				var oInputField = this.byId("containerBarCodeInput");
				// check barcode allready used
				var bBarCodeUsed = false;
				var aContainers = this.getView().getModel("container").getProperty("/rows");
				for (var i = 0; i < aContainers.length; i++) {
					if (aContainers[i].value.barCode === oObject.containerBarCode.value) {
						bBarCodeUsed = true;
						break;
					}
				}
				if (bBarCodeUsed) {
					oModel.setProperty("/containerBarCode/valueState", ValueState.Error);
					oModel.setProperty("/containerBarCode/valueStateText", "Der Barcode wird bereits verwendet");
				} else {
					var oComponent = this.getOwnerComponent();
					oComponent.postDocument("container", {
						barCode: "" + oObject.containerBarCode.value,
						productCategory: oObject.productCategory.value,
						storageBin: oObject.storageBin.value
					}).then(function (oResponse) {
						if (oResponse.response.ok) {
							MessageToast.show("Behälter '" + oObject.containerBarCode.value + "' wurde angelegt", {
								width: "30rem",
								duration: 2000
							});
							oModel.setProperty("/containerBarCode/value", null);
							oComponent.reloadModel("container");
							oInputField && oInputField.focus();
						} else {
							MessageToast.show(oResponse.errorText, {
								width: "30rem",
								duration: 2000
							});
						}
					});
				}

			} else {
				if (!oObject.containerBarCode.value) {
					oModel.setProperty("/containerBarCode/valueState", ValueState.Error);
					oModel.setProperty("/containerBarCode/valueStateText", "Bitte einen Barcode eingeben");
				}

				if (!oObject.productCategory.value) {
					oModel.setProperty("/productCategory/valueState", ValueState.Error);
					oModel.setProperty("/productCategory/valueStateText", "Bitte einen Typ auswählen");
				}
			}
		},

		onCancelAddContainerDialogPress: function () {
			var oDialog = this._getAddDialog();
			oDialog.close();
		},

		onAssignStorageBinPress: function (oEvent) {
			var oView = this.getView();
			var oDialog = this._getStorageBinAssignmentDialog();
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.ContainerAssignStorageBinDialog", this);
				oView.addDependent(oDialog);
				var oModel = new JSONModel();
				oModel.setData({
					storageBin: {
						value: "",
						valueState: ValueState.None,
						valueStateText: ""
					}
				});
				oDialog.setModel(oModel);
			}

			oDialog.setBindingContext(oEvent.getSource().getBindingContext("container"), "container");
			oDialog.open();
		},

		onSaveContainerStorageBinAssignmentPress: function () {
			var oDialog = this._getStorageBinAssignmentDialog();
			var oContainer = oDialog.getBindingContext("container").getProperty("value");
			oContainer.storageBin = oDialog.getModel().getProperty("/storageBin/value");
			var oComponent = this.getOwnerComponent();
			oComponent.putDocument(oContainer).then(function() {
				oDialog.close();
				MessageToast.show("Lagerplatz zugeordnet");
				oComponent.reloadModel("container");
			});
		},

		onSearchContainer: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._containerTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue) {
				oFilter = new Filter({path: "value/barCode", operator: FilterOperator.Contains, value1: sValue});
			}

			oBinding.filter(oFilter);
		},

		_containerTable: function () {
			return this.byId("containerTable");
		},

		onCancelContainerStorageBinAssignmentDialogPress: function () {
			this._getStorageBinAssignmentDialog().close();
		},

		_getStorageBinAssignmentDialog: function () {
			return this.byId("ContainerAssignStorageBinDialog");
		},

		onContainerDeletePress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("container");
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show("Der Behälter '" + oContext.getProperty("value/barCode") + "' wurde gelöscht", {
						width: "30rem",
						duration: 2000
					});
					oComponent.reloadModel("container");
				} else {
					MessageToast.show(oResponse.errorText, {
						width: "30rem",
						duration: 2000
					});
				}};
			oComponent.deleteDocument(oContext.getProperty("value")).then(fnHandler, fnHandler);
		},

		_getAddDialog: function () {
			return this.byId("ContainerAddDialog");
		},

		compareStringAsInt: function () {
			return this.getOwnerComponent().compareStringAsInt.apply(this, arguments);
		}
	});

});
