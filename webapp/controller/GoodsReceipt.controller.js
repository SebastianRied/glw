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
			var oView = this.getView();
			oView.setModel(oModel);
			this.focusControl("containerSelect");
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
					value: (oBatch && oBatch._id) || null,
					valueState: ValueState.None,
					valueStateText: ""
				},
				quantity: {
					value: 0.0,
					valueState: ValueState.None,
					valueStateText: ""
				},
				batchObject: oBatch || {batchDate: null, vol: null}
			};
		},

		onNavBack: function () {
			this.getView().getModel().setProperty("/journal", []);
			this.getView().getModel().setProperty("/candidate", this._createCandidateObject());
			glw.BaseController.prototype.onNavBack.apply(this, arguments);
		},

		onJournalHide: function () {
			this.getModel().setProperty("/showSideContent", false);
		},

		onJournalShow: function () {
			this.getModel().setProperty("/showSideContent", true);
		},

		onAddStock: function () {
			var oModel = this.getView().getModel();
			var aJournal = oModel.getProperty("/journal");
			var oCandidate = oModel.getProperty("/candidate");
			var oJournalEntry = this._createJournalEntry(oCandidate);
			if (this._addStock(oJournalEntry)) {
				this._writeLog(oJournalEntry);
				aJournal.push(oJournalEntry);
				oModel.setProperty("/journal", aJournal);
				oModel.setProperty("/candidate", this._createCandidateObject(oCandidate.batchObject));
				oModel.setProperty("/containerStockDetails", null);
				oModel.refresh(true);
				this.byId("containerSelect").focus();
			}
		},

		_writeLog: function (oJournalEntry) {
			var oComponent = this.getOwnerComponent();
			oComponent.postDocument("log", oJournalEntry);
		},

		_getNumberUnit: function (sProductGroup) {
			return this.getModel("main").getProperty("/validValues/productGroups/" + sProductGroup + "/numberUnit/value");
		},

		_createJournalEntry: function (oCandidate) {
			var oModel = this.getModel("main");

			return {
				container: oModel.getProperty("/_container/" + oCandidate.container.value) || oCandidate.container.value,
				storageBin: oModel.getProperty("/_storageBin/" + oCandidate.storageBin.value) || oCandidate.storageBin.value,
				batch: oModel.getProperty("/_batch/" + oCandidate.batch.value) || oCandidate.batch.value,
				quantity: oCandidate.quantity.value,
				actionDate: new Date(),
				action: "goodsReceipt"
			};
		},

		_getBatch: function (sId) {
			var oComponent = this.getOwnerComponent();
			return oComponent.findEntity("main", "/batch", function (oObject) {
				return oObject._id === sId;
			});
		},

		onBatchSelectionChange: function () {
			var oModel = this.getModel();
			var oSelect = this.byId("batchSelect");

			oModel.setProperty("/candidate/batch/valueState", ValueState.None);
			oModel.setProperty("/candidate/batch/valueStateText", "");
			oModel.setProperty("/candidate/batchObject", this._getBatch(oSelect.getSelectedKey()));
		},

		onContainerSelect: function (oEvent) {
			var oItem = oEvent.getParameter("selectedItem");
			var oContainerContext = oItem.getBindingContext("main");
			var oModel = this.getModel();

			// pre-fill the input field for storage bin with the current location of the selected container
			var sStorageBin = oContainerContext.getProperty("storageBin/_id");
			oModel.setProperty("/candidate/storageBin/value", sStorageBin);

			// get stock info of the container to check whether it is already in use
			var sContainer = this.getView().getModel().getProperty("/candidate/container/value");
			var oStock = this.getOwnerComponent().findEntity("main", "/stock", function (oObject) {
				return oObject.container._id === sContainer && oObject.quantity > 0;
			});


			oModel.setProperty("/containerStockDetails", oStock);

			// if stock was found, default all other candidate values from the stock
			if (oStock) {
				oModel.setProperty("/candidate/batch/value", oStock.batch._id);
				oModel.setProperty("/candidate/quantity/value", 0);
				oModel.setProperty("/candidate/container/valueState", ValueState.Warning);
				oModel.setProperty("/candidate/container/valueStateText", this.getText("messageContainerAlreadyFilled"));
			} else {
				oModel.setProperty("/candidate/container/valueState", ValueState.None);
				oModel.setProperty("/candidate/container/valueStateText", "");
			}

			this.onBatchSelectionChange();
		},

		_addStock: function (oObject) {
			if (this._checkSaveConditions(oObject)) {
				var oComponent = this.getOwnerComponent();

				var oModel = this.getModel();
				var oStock = oModel.getProperty("/containerStockDetails");
				var sStorageBin = oObject.storageBin;
				if (oStock) {
					// update stock
					oStock.quantity += oObject.quantity;
					oComponent.putDocument(oStock).then(function (oResponse) {
						if (oResponse.response.ok) {
							MessageToast.show("Schnaps wurde zugelagert.", {
								width: "30rem",
								duration: 2000
							});

						} else {
							MessageToast.show(oResponse.errorText, {
								width: "30rem",
								duration: 2000
							});
						}
					});
				} else {
					// new stock
					oComponent.postDocument("stock", oObject).then(function (oResponse) {
						if (oResponse.response.ok) {
							MessageToast.show("Schnaps wurde eingelagert.", {
								width: "30rem",
								duration: 2000
							});

						} else {
							MessageToast.show(oResponse.errorText, {
								width: "30rem",
								duration: 2000
							});
						}
					});
				}

				// if the storageBin was changed, update the containers storageBin info
				var oContainer = oComponent.findEntity("main", "/container", function (oEntity) {
					return oEntity._id === oObject.container._id;
				});

				if (oContainer && sStorageBin._id !== oContainer.storageBin._id) {
					oComponent.putDocument(oContainer).then(function () {
						MessageToast.show("Behälter wurde auf den Lagerplatz '" + sStorageBin + "' verschoben", {
							width: "30rem",
							duration: 2000
						});
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
			var oModel = this.getModel();
			oModel.setProperty("/candidate/quantity/valueState", ValueState.None);
			oModel.setProperty("/candidate/quantity/valueStateText", "");

			var bReturn = true;

			var oStock = oModel.getProperty("/containerStockDetails");
			if (oStock) {
				if (oModel.getProperty("/candidate/batch/value") !== oStock.batch._id) {
					oModel.setProperty("/candidate/batch/valueState", ValueState.Error);
					oModel.setProperty("/candidate/batch/valueStateText", "Der Behälter ist bereits mit einer anderen Charge befüllt. Mischen ist nicht zulässig.");
					bReturn = false;
				}

				if (oModel.getProperty("/candidate/quantity/value") < oStock.quantity) {
					oModel.setProperty("/candidate/quantity/valueState", ValueState.Error);
					oModel.setProperty("/candidate/quantity/valueStateText", "Es darf nur Schnaps hinzugefüllt werden. Zum Auslagern muss die entsprechende Eingabemaske verwendet werden.");
					bReturn = false;
				}


			} else {
				if (!oModel.getProperty("/candidate/batch/value")) {
					oModel.setProperty("/candidate/batch/valueState", ValueState.Error);
					oModel.setProperty("/candidate/batch/valueStateText", "Bitte eine Charge auswählen.");
					bReturn = false;
				}

				if (!oModel.getProperty("/candidate/container/value")) {
					oModel.setProperty("/candidate/container/valueState", ValueState.Error);
					oModel.setProperty("/candidate/container/valueStateText", "Bitte einen Behälter auswählen.");
					bReturn = false;
				}
			}

			if (oModel.getProperty("/candidate/quantity/value") <= 0) {
				oModel.setProperty("/candidate/quantity/valueState", ValueState.Error);
				oModel.setProperty("/candidate/quantity/valueStateText", "Die einzulagernde Menge muss größer 0 sein.");
				bReturn = false;
			}

			return bReturn;
		}
	});

});
