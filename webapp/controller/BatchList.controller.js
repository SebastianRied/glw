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

	return Controller.extend('glw.controller.BatchList', {
		formatter: Formatter,
		filterProperties: ["productCategory/name"],
		onInit: function () {
			this.focusControl("searchField");
		},

		onDeleteBatchPress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("main");
			var that = this;
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show(that.getText("messageBatchDeleted", oContext.getProperty("productCategory/name"), oContext.getProperty("batchDate").getFullYear()), {
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
					that.getText("messageBatchStillInStock"),
					{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},

		_checkDeleteConditions: function (oObject) {
			return !this.getOwnerComponent().findEntity("main", "/stock", function (oStock) {
				return oStock.batch._id === oObject._id;
			});
		},

		onOpenAddBatchDialogPress: function () {
			var oView = this.getView();
			var oDialog = this._getAddDialog();
			var oModel;
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "glw.view.BatchAddDialog", this);
				oView.addDependent(oDialog);
				oModel = new JSONModel();
				oDialog.setModel(oModel);
			}
			oModel = oDialog.getModel();
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
				},
				otherCosts: {
					value: null,
					valueState: ValueState.None,
					valueStateText: ""
				}
			});

			oDialog.open();
		},

		onCancelAddBatchDialogPress: function () {
			this._getAddDialog().close();
		},

		onSaveNewBatchPress: function () {
			var oDialog = this._getAddDialog();
			var oModel = oDialog.getModel();

			var oObject = oModel.getObject("/");
			var that = this;

			if (this._checkSaveConditions(oObject, oModel)) {
				var oComponent = this.getOwnerComponent();
				oComponent.postDocument("batch", this.template.getDocument("batch", {
					productCategory: oObject.productCategory.value,
					batchDate: oObject.batchDate.value,
					quantity: oObject.quantity.value,
					vol: oObject.vol.value,
					distillerFee: oObject.distillerFee.value,
					taxes: oObject.taxes.value,
					otherCosts: oObject.otherCosts.value
				})).then(function (oResponse) {
					if (oResponse.response.ok) {
						MessageToast.show(that.getText("messageBatchCreated"), {
							width: "30rem",
							duration: 2000
						});

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

		_getTable: function () {
			return this.byId("batchTable");
		}
	});

});
