sap.ui.define([
	"./BaseController",
	"../model/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/ui/core/ValueState"
], function (Controller, Formatter, JSONModel, Filter, FilterOperator, MessageToast, ValueState) {
	'use strict';

	return Controller.extend('glw.controller.GoodsIssue', {
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

			var oView = this.getView();
			oModel.setData(oData);
			oView.setModel(oModel);
			this.focusControl("containerSelect");
		},

		onNavBack: function () {
			this.getView().getModel().setProperty("/candidate", this._createCandidateObject());
			glw.BaseController.prototype.onNavBack.apply(this, arguments);
		},

		_createCandidateObject: function () {
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
			var sStorageBin = oItem.getBindingContext("main").getProperty("storageBin/id");
			oModel.setProperty("/candidate/storageBin/value", sStorageBin);

			// get stock info of the container to check whether it is already in use
			var sContainer = this.getView().getModel().getProperty("/candidate/container/value");
			var oStock = this.getOwnerComponent().findEntity("main", "/stock", function (oObject) {
				return oObject.container._id === sContainer && oObject.quantity > 0;
			});

			oModel.setProperty("/stock", oStock);
			oModel.setProperty("/container", oItem.getBindingContext("main").getProperty());
		},

		onGoodsIssue: function () {
			var oModel = this.getView().getModel();
			var iQuantity = oModel.getProperty("/candidate/quantity/value");

			// find stock
			var sContainer = this.getView().getModel().getProperty("/candidate/container/value");
			var oStock = this.getOwnerComponent().findEntity("main", "/stock", function (oObject) {
				return oObject.container._id === sContainer && oObject.quantity > 0;
			});
			if (oStock && iQuantity) {
				// reduce stock by entered quantity
				oStock.quantity -= iQuantity;
				var oComponent = this.getOwnerComponent();

				var fnSaveHandler = function () {
					oModel.setProperty("/candidate/quantity/value", 0);
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

		_createJournalEntry: function (oStock) {
			return {
				container: oStock.container,
				storageBin: oStock.container.storageBin,
				batch: oStock.batch,
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
