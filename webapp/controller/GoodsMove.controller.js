sap.ui.define([
	"./BaseController",
	"../model/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/ui/core/ValueState",
	"sap/f/LayoutType"
], function (Controller, Formatter, JSONModel, Filter, FilterOperator, MessageToast, ValueState, LayoutType) {
	'use strict';

	return Controller.extend('glw.controller.GoodsMove', {
		formatter: Formatter,
		onInit: function () {
			var oModel = new JSONModel();
			var oData = {
				sourceStock: null,
				targetStock: null,
				sourceContainer: null,
				targetContainer: null,
				candidate: this._createCandidateObject(),
				newQuantitySource: null,
				newQuantityTarget: null,
				movedQuantity: null,
				moveAllowed: false,
				batch: null
			};

			oModel.setData(oData);
			this.getView().setModel(oModel);
			this.focusControl("sourceContainerSelect");
		},

		onNavBack: function () {
			this.getView().getModel().setProperty("/candidate", this._createCandidateObject());
			this.getView().getModel().setProperty("/movedQuantity", null);

			glw.BaseController.prototype.onNavBack.apply(this, arguments);
		},

		_createCandidateObject: function (oBatch) {
			return {
				sourceContainer: {
					value: "",
					valueState: ValueState.None,
					valueStateText: ""
				},
				targetContainer: {
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
			var oSourceItem = this.byId("sourceContainerSelect").getSelectedItem();
			var oTargetItem = this.byId("targetContainerSelect").getSelectedItem();

			var oModel = this.getView().getModel();
			oModel.setProperty("/newQuantitySource", null);
			oModel.setProperty("/newQuantityTarget", null);
			oModel.setProperty("/movedQuantity", null);

			var sSourceContainer, sTargetContainer;
			if (oSourceItem) {
				// get stock info of the container to check whether it is already in use
				sSourceContainer = oModel.getProperty("/candidate/sourceContainer/value");
				var oSourceStock = this.getOwnerComponent().findEntity("main", "/stock", function (oObject) {
					return oObject.container._id === sSourceContainer && oObject.quantity > 0;
				});
			}

			if (oTargetItem) {
				// get stock info of the container to check whether it is already in use
				sTargetContainer = oModel.getProperty("/candidate/targetContainer/value");
				var oTargetStock = this.getOwnerComponent().findEntity("main", "/stock", function (oObject) {
					return oObject.container._id === sTargetContainer && oObject.quantity > 0;
				});
			}

			oModel.setProperty("/candidate/targetContainer/valueState", ValueState.None);
			oModel.setProperty("/candidate/targetContainer/valueStateText", "");
			oModel.setProperty("/moveAllowed", true);

			if (sSourceContainer && sSourceContainer === sTargetContainer) {
				oModel.setProperty("/candidate/targetContainer/valueState", ValueState.Error);
				oModel.setProperty("/candidate/targetContainer/valueStateText", "Entnahmebehälter und Zielbehälter dürfen nicht identisch sein.");
				oModel.setProperty("/moveAllowed", true);
			} else {
				if (oTargetStock) {
					// target and source stock must be of the same batch. Otherwise goods move is not allowed
					if (oSourceStock && oSourceStock.batch._id !== oTargetStock.batch._id) {
						oModel.setProperty("/candidate/targetContainer/valueState", ValueState.Error);
						oModel.setProperty("/candidate/targetContainer/valueStateText", "Zielbehälter enthält: " + oTargetStock.batch.productCategory.name + " (" + oTargetStock.batch.year + "). " + "Er muss leer sein oder bereits die gleiche Charge wie der Entnahmebehälter beinhalten.");
						oModel.setProperty("/moveAllowed", false);
					} else {
						oModel.setProperty("/candidate/targetContainer/valueState", ValueState.Warning);
						oModel.setProperty("/candidate/targetContainer/valueStateText", "Zielbehälter enthält bereits " + oTargetStock.quantity + " " + oTargetStock.batch.productCategory.productGroup.numberUnit.value + " " + oTargetStock.batch.productCategory.name + " (" + oTargetStock.batch.year + "). ");
					}
				} else {
					oModel.setProperty("/moveAllowed", true);
				}
			}

			oModel.setProperty("/sourceStock", oSourceStock);
			oModel.setProperty("/sourceContainer", oSourceItem.getBindingContext("main").getProperty());
		},

		onGoodsMove: function () {
			var oView = this.getView();
			var oModel = oView.getModel();
			var oComponent = this.getOwnerComponent();
			oModel.setProperty("/candidate/quantity/value", Math.min(oModel.getProperty("/candidate/quantity/value"), oModel.getProperty("/sourceStock/quantity")));
			var iQuantity = oModel.getProperty("/candidate/quantity/value");

			// find stock
			var sSourceContainer = oModel.getProperty("/candidate/sourceContainer/value");
			var oSourceStock = oComponent.findEntity("main", "/stock", function (oObject) {
				return oObject.container._id === sSourceContainer && oObject.quantity > 0;
			});

			var sTargetContainer = oModel.getProperty("/candidate/targetContainer/value");
			var oTargetStock = oComponent.findEntity("main", "/stock", function (oObject) {
				return oObject.container._id === sTargetContainer && oObject.quantity > 0;
			});

			if (oSourceStock && iQuantity) {
				// reduce stock by entered quantity
				oSourceStock.quantity -= iQuantity;

				var oTargetStockPromise;
				if (oTargetStock) {
					oTargetStock.quantity += iQuantity;
					oTargetStockPromise = oComponent.putDocument(oTargetStock);

				} else {
					// create new stock
					var oCandidate = this.getView().getModel().getProperty("/candidate");
					oTargetStock = {
						container: this.getModel("main").getProperty("/_container/" + sTargetContainer),
						batch: oSourceStock.batch,
						quantity: oCandidate.quantity.value,
						actionDate: new Date(),
						action: "goodsMove"
					};
					oTargetStockPromise = oComponent.postDocument("stock", oTargetStock);
				}

				oModel.setProperty("/targetStock", oTargetStock || null);

				var oSourceStockPromise;
				if (oSourceStock.quantity <= 0) {
					oSourceStockPromise = oComponent.deleteDocument(oSourceStock);
				} else {
					oSourceStockPromise = oComponent.putDocument(oSourceStock);
				}

				var fnSaveHandler = function () {
					// avoid duplicate bookings, reset the quantity after successful booking
					oModel.setProperty("/candidate/quantity/value", 0);

					// write log entry
					oComponent.postDocument("log", this._createJournalEntry(oSourceStock));
					oComponent.postDocument("log", this._createJournalEntry(oTargetStock));

					oModel.setProperty("/newQuantitySource", oSourceStock.quantity);
					oModel.setProperty("/newQuantityTarget", oTargetStock.quantity);
					oModel.setProperty("/movedQuantity", iQuantity);
					oModel.setProperty("/candidate/targetContainer/value", null);
					oModel.setProperty("/candidate/targetContainer/valueState", ValueState.None);
					oModel.setProperty("/candidate/targetContainer/valueStateText", "");
					oModel.setProperty("/moveAllowed", false);

					if (oSourceStock.quantity <= 0) {
						oModel.setProperty("/candidate/sourceContainer/value", null);
						window.setTimeout(function () {
							oView.byId("sourceContainerSelect").focus();
						}, 0);
					} else {
						window.setTimeout(function () {
							oView.byId("targetContainerSelect").focus();
						}, 0);
					}

					MessageToast.show("Schnaps wurde umgelagert.", {
						width: "30rem",
						duration: 2000
					});
				}.bind(this);

				Promise.all([oSourceStockPromise, oTargetStockPromise]).then(fnSaveHandler);
			}
		},

		_getBatch: function (sId) {
			var oComponent = this.getOwnerComponent();
			return oComponent.findEntity("main", "/batch", function (oObject) {
				return oObject._id === sId;
			});
		},

		_createJournalEntry: function (oStock, bTarget) {
			return {
				container: oStock.container,
				storageBin: oStock.container.storageBin,
				batch: oStock.batch,
				quantity: oStock.quantity,
				actionDate: new Date(),
				action: "goodsMove" + (bTarget ? "To" : "From")
			};
		},

		onQuantityChange: function () {
			var oModel = this.getView().getModel();
			oModel.setProperty("/newQuantity", null);
			oModel.setProperty("/candidate/quantity/value", Math.min(oModel.getProperty("/candidate/quantity/value"), oModel.getProperty("/sourceStock/quantity")));
			this.onContainerSelect();
		}

	});

});
