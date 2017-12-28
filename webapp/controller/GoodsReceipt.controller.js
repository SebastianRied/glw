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
				productCategory: {
					value: "",
					valueState: ValueState.None,
					valueStateText: ""
				},
				batch: {
					value: oBatch,
					valueState: ValueState.None,
					valueStateText: ""
				},
				quantity: {
					value: 0,
					valueState: ValueState.None,
					valueStateText: ""
				}
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
			this._addStock(oJournalEntry);
			aJournal.push(oJournalEntry);
			oModel.setProperty("/journal", aJournal);
			oModel.setProperty("/candidate", this._createCandidateObject(oCandidate.batch.value));
			oModel.refresh(true);
		},

		_getNumberUnit: function (sProductGroup) {
			var oModel = this.getView().getModel("validValues");
			var oProductGroup = oModel.getProperty("/productGroups/" + sProductGroup);

			if (oProductGroup) {
				return oModel.getProperty("/numberUnits/" + oProductGroup.numberUnit);
			}
		},

		_createJournalEntry: function (oCandidate) {
			var oProductCategoryModel = this.getView().getModel("productCategories");
			var aProductCategories = oProductCategoryModel.getProperty("/rows");
			var sNumberUnit;
			for (var i = 0; i < aProductCategories.length; i++) {
				if (aProductCategories[i].id === oCandidate.productCategory.value) {
					sNumberUnit = this._getNumberUnit(aProductCategories[i].value.productGroup);
					sNumberUnit = sNumberUnit && sNumberUnit.id;
					break;
				}
			}
			return {
				container: oCandidate.container.value,
				storageBin: oCandidate.storageBin.value,
				productCategory: oCandidate.productCategory.value,
				batch: oCandidate.batch.value,
				quantity: oCandidate.quantity.value,
				numberUnit: sNumberUnit
			};
		},

		onContainerSelect: function (oEvent) {
			var oItem = oEvent.getParameter("selectedItem");
			this.getView().getModel().setProperty("/candidate/storageBin/value", oItem.getBindingContext("container").getProperty("value/storageBin"))
		},

		_addStock: function (oObject) {
			if (oObject) {
				var oComponent = this.getOwnerComponent();
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
		},

		onCancelAddContainerDialogPress: function () {
			var oDialog = this._getAddDialog();
			oDialog.close();
		}
		,

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
		}
		,

		onSaveContainerStorageBinAssignmentPress: function () {
			var oDialog = this._getStorageBinAssignmentDialog();
			var oContainer = oDialog.getBindingContext("container").getProperty("value");
			oContainer.storageBin = oDialog.getModel().getProperty("/storageBin/value");
			var oComponent = this.getOwnerComponent();
			oComponent.putDocument(oContainer).then(function () {
				oDialog.close();
				MessageToast.show("Lagerplatz zugeordnet");
				oComponent.reloadModel("container");
			});
		}
		,

		onSearchContainer: function (oEvent) {
			var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query");
			var oTable = this._getTable();
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var oFilter;
			if (sValue) {
				oFilter = new Filter({path: "value/barCode", operator: FilterOperator.Contains, value1: sValue});
			}

			oBinding.filter(oFilter);
		}
		,

		_getTable: function () {
			return this.byId("containerTable");
		}
		,

		onCancelContainerStorageBinAssignmentDialogPress: function () {
			this._getStorageBinAssignmentDialog().close();
		}
		,

		_getStorageBinAssignmentDialog: function () {
			return this.byId("ContainerAssignStorageBinDialog");
		}
		,

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
				}
			};
			oComponent.deleteDocument(oContext.getProperty("value")).then(fnHandler, fnHandler);
		}
		,

		_getAddDialog: function () {
			return this.byId("ContainerAddDialog");
		}
		,

		compareStringAsInt: function () {
			return this.getOwnerComponent().compareStringAsInt.apply(this, arguments);
		}
	});

});
