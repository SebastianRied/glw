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

	return Controller.extend('glw.controller.ContainerList', {
		formatter: Formatter,
		filterProperties: ["barCode"],
		onInit: function () {
			this.focusControl("searchField");
		},

		onContainerDeletePress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("main");
			var that = this;
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show(that.getText("messageContainerDeleted", oContext.getProperty("barCode")), {
						width: "30rem",
						duration: 2000
					});
				} else {
					MessageToast.show(oResponse.errorText, {
						width: "30rem",
						duration: 2000
					});
				}
			};
			if (this._checkDeleteConditions(oContext.getProperty())) {
				oComponent.deleteDocument(oContext.getProperty()).then(fnHandler, fnHandler);
			} else {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					this.getText("messageContainerStillInUse"),
					{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},

		_checkDeleteConditions: function (oObject) {
			return !this.getOwnerComponent().findEntity("main", "/stock", function (oStock) {
				return oObject.barCode === oStock.container.barCode && oStock.quantity > 0;
			});
		},

		onOpenAddContainerDialogPress: function () {
			var oView = this.getView();
			var oModel;
			var oDialog = this._getAddDialog();
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.ContainerAddDialog", this);
				oView.addDependent(oDialog);
				oModel = new JSONModel();
				oDialog.setModel(oModel);
			}
			oModel = oDialog.getModel();
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

			oDialog.open();
		},

		onSaveNewContainerPress: function () {
			var oDialog = this._getAddDialog();
			var oModel = oDialog.getModel();
			oModel.setProperty("/containerBarCode/valueState", ValueState.None);
			oModel.setProperty("/containerBarCode/valueStateText", "");
			oModel.setProperty("/productCategory/valueState", ValueState.None);
			oModel.setProperty("/productCategory/valueStateText", "");
			var that = this;
			var oObject = oModel.getObject("/");
			oObject.containerBarCode.value = jQuery.trim(oObject.containerBarCode.value);
			if (oObject.containerBarCode.value && oObject.productCategory.value) {
				var oInputField = this.byId("containerBarCodeInput");
				// check barcode allready used
				var bBarCodeUsed = false;
				var aContainers = this.getView().getModel("main").getProperty("/container");
				for (var i = 0; i < aContainers.length; i++) {
					if (aContainers[i].barCode === oObject.containerBarCode.value) {
						bBarCodeUsed = true;
						break;
					}
				}
				if (bBarCodeUsed) {
					oModel.setProperty("/containerBarCode/valueState", ValueState.Error);
					oModel.setProperty("/containerBarCode/valueStateText", this.getText("messageBarcodeAlreadyInUse"));
				} else {
					var oComponent = this.getOwnerComponent();
					oComponent.postDocument("container", {
						barCode: "" + oObject.containerBarCode.value,
						productCategory: oObject.productCategory.value,
						storageBin: oObject.storageBin.value
					}).then(function (oResponse) {
						if (oResponse.response.ok) {
							MessageToast.show(that.getText("messageCreated", that.getText("container"), oObject.containerBarCode.value), {
								width: "30rem",
								duration: 2000
							});
							oModel.setProperty("/containerBarCode/value", null);
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
			var oModel;
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.ContainerAssignStorageBinDialog", this);
				oView.addDependent(oDialog);
				oModel = new JSONModel();
				oModel.setData({
					storageBin: {
						value: "",
						valueState: ValueState.None,
						valueStateText: ""
					}
				});
				oDialog.setModel(oModel);
			}

			oModel = oDialog.getModel();
			oModel.setProperty("/storageBin/value", oEvent.getSource().getBindingContext("main").getProperty("storageBin/_id"));
			oDialog.setBindingContext(oEvent.getSource().getBindingContext("main"), "main");
			oDialog.open();
		},

		onSaveContainerStorageBinAssignmentPress: function () {
			var oDialog = this._getStorageBinAssignmentDialog();
			var oDialogModel = oDialog.getModel();
			var oContainer = oDialog.getBindingContext("main").getProperty();
			oContainer.storageBin = oDialogModel.getProperty("/storageBin/value");

			var oComponent = this.getOwnerComponent();
			if (this._storageBinFound) {
				oDialogModel.setProperty("/storageBin/valueState", ValueState.None);
				oDialogModel.setProperty("/storageBin/valueStateText", "");
				oComponent.putDocument(oContainer).then(function () {
					oDialog.close();
					MessageToast.show("Lagerplatz zugeordnet");
				});
			} else {
				MessageToast.show("Der angegebene Lagerplatz existiert nicht.");
				oDialogModel.setProperty("/storageBin/valueState", ValueState.Error);
				oDialogModel.setProperty("/storageBin/valueStateText", this.getText("chooseStorageBin"));
			}
		},

		_getTable: function () {
			return this.byId("containerTable");
		},

		onCancelContainerStorageBinAssignmentDialogPress: function () {
			this._getStorageBinAssignmentDialog().close();
		},

		_getStorageBinAssignmentDialog: function () {
			return this.byId("ContainerAssignStorageBinDialog");
		},

		_getAddDialog: function () {
			return this.byId("ContainerAddDialog");
		},

		onStorageBinChange: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			this._storageBinFound  = !(sValue && !this.getOwnerComponent().findEntity("main", "/storageBin", function (oStorageBin) {
					return sValue === oStorageBin.id;
				}));
		},

		handleListClose: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource().getParent();
			this._filterModel(oFacetFilter);
		}
	});

});
