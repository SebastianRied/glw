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

	return Controller.extend('glw.controller.StorageBinsList', {
		formatter: Formatter,
		filterProperties: ["id"],
		onInit: function () {
			this.focusControl("searchField");
		},

		onDeleteStorageBinPress: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			var oContext = oEvent.getParameter("listItem").getBindingContext("main");
			var that = this;
			var fnHandler = function (oResponse) {
				if (oResponse.response.ok) {
					MessageToast.show(that.getText("messageStorageBinDeleted", oContext.getProperty("id")), {
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
					this.getText("messageStorageBinStillInUse"),
					{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},

		_checkDeleteConditions: function (oObject) {
			return !this.getOwnerComponent().findEntity("main", "/container", function (oContainer) {
				return oContainer.storageBin && oObject.id === oContainer.storageBin.id;
			});
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

			var oObject = oModel.getObject("/");

			if (this._checkSaveConditions(oObject, oModel)) {
				var oComponent = this.getOwnerComponent();
				var that = this;
				oComponent.postDocument("storageBin", {
					id: oObject.storageBinId.value
				}).then(function (oResponse) {
					if (oResponse.response.ok) {
						MessageToast.show(that.getText("messageStorageBinCreated", oObject.storageBinId.value), {
							width: "30rem",
							duration: 2000
						});
						oModel.setProperty("/storageBinId/value", "");
						that.byId("storageBinIdInput").focus();
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
			oModel.setProperty("/storageBinId/valueState", ValueState.None);
			oModel.setProperty("/storageBinId/valueStateText", "");
			var bReturn = true;
			// storageBinId must not be empty
			if (!oObject.storageBinId.value) {
				oModel.setProperty("/storageBinId/valueState", ValueState.Error);
				oModel.setProperty("/storageBinId/valueStateText", this.getText("messageEnterStorageBinNumber"));
				bReturn = false;
			}

			// storageBinId must be unique
			if (this.getOwnerComponent().findEntity("main", "/storageBin", function (oStorageBin) {
					return oObject.storageBinId.value === oStorageBin.id;
				})) {
				oModel.setProperty("/storageBinId/valueState", ValueState.Error);
				oModel.setProperty("/storageBinId/valueStateText", this.getText("messageStorageBinExists"));
				bReturn = false;
			}

			return bReturn;
		},

		_getAddDialog: function () {
			return this.byId("StorageBinAddDialog");
		},

		_getTable: function () {
			return this.byId("storageBinTable");
		}
	});

});
