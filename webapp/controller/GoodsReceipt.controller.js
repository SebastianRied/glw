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

	return Controller.extend('glw.controller.GoodsReceipt', {
		formatter: Formatter,
		onInit: function () {
			var oModel = new JSONModel();
			var oData = {
				showSideContent: true,
				containerStockDetails: null,
				candidate: this._createCandidateObject(),
				journal: []
			};

			oModel.setData(oData);
			this.getView().setModel(oModel);
		},

		_createCandidateObject: function (oBatch) {
			return {
				container: {
					value: "",
					valueState: ValueState.None,
					valueStateText: ""
				},
				storageBin: {
					value: "",
					valueState: ValueState.None,
					valueStateText: ""
				},
				batch: {
					value: oBatch && oBatch._id,
					valueState: ValueState.None,
					valueStateText: ""
				},
				quantity: {
					value: 0.0,
					valueState: ValueState.None,
					valueStateText: ""
				},
				batchObject: oBatch
			};
		},

		onNavBack: function () {
			this.getView().getModel().setProperty("/journal", []);
			this.getView().getModel().setProperty("/candidate", this._createCandidateObject());
			this.getOwnerComponent().onNavBack();
		},

		onJournalHide: function () {
			this.getView().getModel().setProperty("/showSideContent", false);
		},

		onJournalShow: function () {
			this.getView().getModel().setProperty("/showSideContent", true);
		},

		onAddStock: function () {
			var oModel = this.getView().getModel();
			var aJournal = oModel.getProperty("/journal");
			var oCandidate = oModel.getProperty("/candidate");
			var oJournalEntry = this._createJournalEntry(oCandidate);
			if (this._addStock(JSON.parse(JSON.stringify(oJournalEntry)))) {
				aJournal.push(oJournalEntry);
				oModel.setProperty("/journal", aJournal);
				oModel.setProperty("/candidate", this._createCandidateObject(oCandidate.batchObject));
				oModel.refresh(true);
			}
		},

		_getNumberUnit: function (sProductGroup) {
			var oModel = this.getView().getModel("validValues");
			var oProductGroup = oModel.getProperty("/productGroups/" + sProductGroup);

			if (oProductGroup) {
				return oModel.getProperty("/numberUnits/" + oProductGroup.numberUnit);
			}
		},

		_createJournalEntry: function (oCandidate) {
			var oBatch = this._getBatch(oCandidate.batch.value);

			return {
				container: oCandidate.container.value,
				storageBin: oCandidate.storageBin.value,
				batch: oBatch,
				quantity: oCandidate.quantity.value
			};
		},

		_getBatch: function (sId) {
			var oComponent = this.getOwnerComponent();
			return oComponent.findEntity("batches", "/list", function (oObject) {
				return oObject._id === sId;
			});
		},

		onBatchSelectionChange: function () {
			var oModel = this.getView().getModel();
			var oSelect = this.byId("batchSelect");
			oModel.setProperty("/candidate/batchObject", this._getBatch(oSelect.getSelectedKey()));
		},

		onContainerSelect: function (oEvent) {
			var oItem = oEvent.getParameter("selectedItem");
			var oModel = this.getView().getModel();

			// pre-fill the input field for storage bin with the current location of the selected container
			var sStorageBin = oItem.getBindingContext("container").getProperty("value/storageBin");
			oModel.setProperty("/candidate/storageBin/value", sStorageBin);

			// get stock info of the container to check whether it is already in use
			var sContainer = this.getView().getModel().getProperty("/candidate/container/value");
			var oStock = this.getOwnerComponent().findEntity("stock", "/rows", function (oObject) {
				return oObject.value.container === sContainer && oObject.value.quantity > 0;
			});


			oModel.setProperty("/containerStockDetails", oStock);

			// if stock was found, default all other candidate values from the stock
			if (oStock) {
				oModel.setProperty("/candidate/batch/value", oStock.value.batch);
				oModel.setProperty("/candidate/quantity/value", oStock.value.quantity);
				oModel.setProperty("/candidate/container/valueState", ValueState.Warning);
				oModel.setProperty("/candidate/container/valueStateText", "Der Behälter ist bereits befüllt.");
			} else {
				oModel.setProperty("/candidate/batch/value", null);
				oModel.setProperty("/candidate/quantity/value", null);
				oModel.setProperty("/candidate/container/valueState", ValueState.None);
				oModel.setProperty("/candidate/container/valueStateText", "");
			}

			this.onBatchSelectionChange();
		},

		_addStock: function (oObject) {
			if (this._checkSaveConditions(oObject)) {
				oObject.batch = oObject.batch._id;
				var oComponent = this.getOwnerComponent();

				var oModel = this.getView().getModel();
				var oStock = oModel.getProperty("/containerStockDetails/value");
				var sStorageBin = oObject.storageBin;
				if (oStock) {
					// update stock
					oStock.quantity = oObject.quantity;
					oComponent.putDocument(oStock).then(function (oResponse) {
						if (oResponse.response.ok) {
							MessageToast.show("Schnaps wurde zugelagert.", {
								width: "30rem",
								duration: 2000
							});

							oComponent.reloadModel("stock");
						} else {
							MessageToast.show(oResponse.errorText, {
								width: "30rem",
								duration: 2000
							});
						}
					});
				} else {
					// new stock
					delete oObject.storageBin;
					oComponent.postDocument("stock", oObject).then(function (oResponse) {
						if (oResponse.response.ok) {
							MessageToast.show("Schnaps wurde eingelagert.", {
								width: "30rem",
								duration: 2000
							});

							oComponent.reloadModel("stock");
						} else {
							MessageToast.show(oResponse.errorText, {
								width: "30rem",
								duration: 2000
							});
						}
					});
				}

				// if the storageBin was changed, update the containers storageBin info
				var oContainer = oComponent.findEntity("container", "/rows", function (oEntity) {
					return oEntity.value.barCode === oObject.container;
				});

				if (oContainer && sStorageBin !== oContainer.value.storageBin) {
					oContainer = oContainer.value;
					oContainer.storageBin = sStorageBin;
					oComponent.putDocument(oContainer).then(function () {
						MessageToast.show("Behälter wurde auf den Lagerplatz '" + sStorageBin + "' verschoben", {
							width: "30rem",
							duration: 2000
						});
						oComponent.reloadModel("container");
					});
				}

				return true;
			}
			return false;
		},

		_checkSaveConditions: function (oObject) {
			if (!oObject) {
				return false;
			}

			var oModel = this.getView().getModel();
			var oStock = oModel.getProperty("/containerStockDetails/value");
			if (oStock) {
				if (oModel.getProperty("/candidate/batch/value") !== oStock.batch) {
					oModel.setProperty("/candidate/batch/valueState", ValueState.Error);
					oModel.setProperty("/candidate/batch/valueStateText", "Der Behälter ist bereits mit einer anderen Charge befüllt. Mischen ist nicht zulässig.");
					return false;
				}

				if (oModel.getProperty("/candidate/quantity/value") < oStock.quantity) {
					oModel.setProperty("/candidate/quantity/valueState", ValueState.Error);
					oModel.setProperty("/candidate/quantity/valueStateText", "Es darf nur Schnaps hinzugefüllt werden. Zum Auslagern muss die entsprechende Eingabemaske verwendet werden.");
					return false;
				}

				if (oModel.getProperty("/candidate/quantity/value") <= 0) {
					oModel.setProperty("/candidate/quantity/valueState", ValueState.Error);
					oModel.setProperty("/candidate/quantity/valueStateText", "Die einzulagernde Menge muss größer 0 sein.");
					return false;
				}
			}

			return true;
		}
	});

});
