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

	return Controller.extend('glw.controller.GoodsMove', {
		formatter: Formatter,
		onInit: function () {
			var oModel = new JSONModel();
			var oData = {
				stock: null,
				container: null,
				candidate: this._createCandidateObject(),
				newQuantity: null,
				issuedQuantity: null
			};

			oModel.setData(oData);
			this.getView().setModel(oModel);
		},

		onNavBack: function () {
			this.getView().getModel().setProperty("/candidate", this._createCandidateObject());
			this.getOwnerComponent().onNavBack();
		},

		_createCandidateObject: function (oBatch) {
			return {
				container: {
					value: "",
					valueState: ValueState.None,
					valueStateText: ""
				},
				quantity: {
					value: 0.0,
					valueState: ValueState.None,
					valueStateText: ""
				}
			};
		},

		onContainerSelect: function () {
			var oItem = this.byId("containerSelect").getSelectedItem();
			var oModel = this.getView().getModel();
			oModel.setProperty("/newQuantity", null);

			// pre-fill the input field for storage bin with the current location of the selected container
			var sStorageBin = oItem.getBindingContext("container").getProperty("value/storageBin");
			oModel.setProperty("/candidate/storageBin/value", sStorageBin);

			// get stock info of the container to check whether it is already in use
			var sContainer = this.getView().getModel().getProperty("/candidate/container/value");
			var oStock = this.getOwnerComponent().findEntity("stock", "/list", function (oObject) {
				return oObject.container === sContainer && oObject.quantity > 0;
			});

			if (oStock) {
				oStock = JSON.parse(JSON.stringify(oStock));
				oStock.batch.batchDate = new Date(oStock.batch.batchDate);
			}

			oModel.setProperty("/stock", oStock);
			oModel.setProperty("/container", oItem.getBindingContext("container").getProperty("value"));
		},

		onGoodsIssue: function () {
			var oModel = this.getView().getModel();
			var iQuantity = oModel.getProperty("/candidate/quantity/value");

			// find stock
			var sContainer = this.getView().getModel().getProperty("/candidate/container/value");
			var oStock = this.getOwnerComponent().findEntity("stock", "/rows", function (oObject) {
				return oObject.value.container === sContainer && oObject.value.quantity > 0;
			});
			if (oStock && iQuantity) {
				// reduce stock by entered quantity
				oStock = oStock.value;
				oStock.quantity -= iQuantity;
				var oComponent = this.getOwnerComponent();

				var fnSaveHandler = function () {
					oModel.setProperty("/candidate/quantity/value", 0);
					// reload stock model
					oComponent.reloadModel("stock");

					// write log entry
					oComponent.postDocument("log", this._createJournalEntry(oStock));

					oModel.setProperty("/newQuantity", oStock.quantity);
					oModel.setProperty("/issuedQuantity", iQuantity);
					MessageToast.show("Schnaps wurde ausgelagert. Der Behälter befindet sich noch im Lager.", {
						width: "30rem",
						duration: 2000
					});
				}.bind(this);

				if (oStock.quantity <= 0) {
					oComponent.deleteDocument(oStock).then(fnSaveHandler);
				} else {
					oComponent.putDocument(oStock).then(fnSaveHandler);
				}
			}
		},

		_getBatch: function (sId) {
			var oComponent = this.getOwnerComponent();
			return oComponent.findEntity("batches", "/list", function (oObject) {
				return oObject._id === sId;
			});
		},

		_createJournalEntry: function (oStock) {
			var oBatch = this._getBatch(oStock.batch);
			var oComponent = this.getOwnerComponent();
			var oContainer = oComponent.findEntity("container", "/rows", function (oObject) {
				return oObject.value.barCode === oStock.container;
			});

			return {
				container: oStock.container,
				storageBin: oContainer.value.storageBin,
				batch: oBatch,
				quantity: oStock.quantity,
				actionDate: new Date(),
				action: "goodsIssue"
			};
		},

		onQuantityChange: function () {
			var oModel = this.getView().getModel();
			oModel.setProperty("/newQuantity", null);
			this.onContainerSelect();
		}

	});

});
