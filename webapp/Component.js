sap.ui.define([
		"sap/ui/core/UIComponent",
		"sap/ui/core/routing/History",
		"./model/formatter",
		"./model/modelChangeHandler",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageToast"],
	function (UIComponent, History, Formatter, ModelChangeHandler, JSONModel, MessageToast) {
		"use strict";
		return UIComponent.extend('glw.Component', {
			metadata: {
				manifest: "json"
			},
			_allowedTypes: ["container", "batch", "productCategory", "validValues", "storageBin", "stock", "log"],

			init: function () {
				// call the init function of the parent
				UIComponent.prototype.init.apply(this, arguments);
				this._initModelPromises();
				this.models.validValues.loaded.then(this._checkAndInstallValidValues.bind(this));
				this.setModel(new JSONModel({
					totalQuantity: 0,
					filteredQuantity: 0,
					inventoryCheck: false,
					quantityFieldProperties: {
						stepInputStep: 0.5,
						stepInputLargerStep: 1,
						stepInputDisplayValuePrecision: 2
					}
				}), "viewModel");
				this.dbName = "glw";
				this.getRouter().initialize();
			},

			_getDBPath: function () {
				return "/couchDB/" + this.dbName + "/";
			},

			_initModelPromises: function () {
				var that = this;
				var fnGetPromise = function (sModelName) {
					return new Promise(function (resolve) {
						that.models[sModelName].model.attachRequestCompleted(function () {
							if (typeof ModelChangeHandler.prototype[sModelName + "ModelChanged"] === "function") {
								ModelChangeHandler.prototype[sModelName + "ModelChanged"].call(that, that.models[sModelName].model);
							}
							resolve(that.models[sModelName]);
						});
					});
				};

				this.models = {};
				var mModels = this.getManifestEntry("sap.ui5").models;
				var aModelNames = Object.getOwnPropertyNames(mModels);
				for (var i = 0; i < aModelNames.length; i++) {
					if (mModels[aModelNames[i]].uri && mModels[aModelNames[i]].uri.indexOf("couchDB") === 0) {
						this.models[aModelNames[i]] = {
							name: aModelNames[i],
							model: this.getModel(aModelNames[i])
						};

						this.models[aModelNames[i]].loaded = fnGetPromise(aModelNames[i]);
					}
				}
			},

			onNavBack: function () {
				var oHistory = History.getInstance();
				var sPreviousHash = oHistory.getPreviousHash();

				if (sPreviousHash !== undefined) {
					window.history.go(-1);
				} else {
					var oRouter = this.getRouter();
					oRouter.navTo("launchpad", {}, true);
				}
			},

			postDocument: function (sType, oDocument) {
				if (this._allowedTypes.indexOf(sType) < 0) {
					throw "Document type " + sType + " not supported!";
				}

				if (typeof oDocument !== "object") {
					throw "oDocument must be an object!";
				}

				return new Promise(function (resolve, reject) {
					oDocument.type = sType;
					var sBody = JSON.stringify(oDocument);

					var fnSuccess = function (oResponse) {
						if (oResponse && oResponse.currentTarget) {
							oResponse = oResponse.currentTarget;
							if (oResponse.status >= 200 && oResponse.status < 300) {
								resolve({response: JSON.parse(oResponse.response)});
							} else {
								reject({response: JSON.parse(oResponse.response), errorText: oResponse.statusText});
							}
						}
					};
					var fnError = function (oResponse) {
						throw "Connection to database broken";
					};
					var oRequest = new XMLHttpRequest();
					oRequest.open("POST", this._getDBPath());
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", fnSuccess);
					oRequest.addEventListener("error", fnError);
					oRequest.send(sBody);
				}.bind(this));
			},

			putDocument: function (sId, sType, oDocument) {
				var sRevision = "";
				if (typeof sId === "object") {
					oDocument = sId;
					sId = oDocument._id;
					sType = oDocument.type;
					sRevision = "?rev=" + oDocument._rev;
				}

				if (this._allowedTypes.indexOf(sType) < 0) {
					throw "Document type " + sType + " not supported!";
				}

				if (typeof oDocument !== "object") {
					throw "oDocument must be an object!";
				}

				return new Promise(function (resolve, reject) {
					oDocument.type = sType;
					var sBody = JSON.stringify(oDocument);

					var fnSuccess = function (oResponse) {
						if (oResponse && oResponse.currentTarget) {
							oResponse = oResponse.currentTarget;
							if (oResponse.status >= 200 && oResponse.status < 300) {
								resolve({response: JSON.parse(oResponse.response)});
							} else {
								reject({response: JSON.parse(oResponse.response), errorText: oResponse.statusText});
							}
						}
					};
					var fnError = function (oResponse) {
						throw "Connection to database broken";
					};
					var oRequest = new XMLHttpRequest();
					oRequest.open("PUT", this._getDBPath() + sId + sRevision);
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", fnSuccess);
					oRequest.addEventListener("error", fnError);
					oRequest.send(sBody);
				}.bind(this));
			},

			deleteDocument: function (oDocument, sRevision) {
				var sId;
				if (typeof oDocument === "object") {
					sId = oDocument._id;
					sRevision = oDocument._rev;
				} else if (typeof oDocument === "string" && typeof sRevision === "string") {
					sId = oDocument;
				} else {
					throw "Document must be an object or string. If string, the revision must be supplied as well.";
				}
				return new Promise(function (resolve, reject) {
					var fnSuccess = function (oResponse) {
						if (oResponse && oResponse.currentTarget) {
							oResponse = oResponse.currentTarget;
							if (oResponse.status >= 200 && oResponse.status < 300) {
								resolve({response: JSON.parse(oResponse.response)});
							} else {
								reject({response: JSON.parse(oResponse.response), errorText: oResponse.statusText});
							}
						}
					};
					var fnError = function (oResponse) {
						throw "Connection to database broken";
					};
					var oRequest = new XMLHttpRequest();
					oRequest.open("DELETE", this._getDBPath() + sId + "?rev=" + sRevision);
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", fnSuccess);
					oRequest.addEventListener("error", fnError);
					oRequest.send();
				}.bind(this));
			},

			reloadModel: function (sModelName) {
				var sProductModelUri = this.getManifestEntry("sap.ui5").models[sModelName].uri;
				this.getModel(sModelName).loadData(sProductModelUri);
			},

			_checkAndInstallValidValues: function () {
				var that = this;
				// check DB exists, install if not found
				var oDBCreated = new Promise(function(resolve) {
					var oDBModel = new JSONModel(that._getDBPath());
					oDBModel.attachRequestCompleted(function (oEvent) {
						if (oEvent.getParameter("success")) {
							resolve();
						} else {
							var oRequest = new XMLHttpRequest();
							oRequest.open("PUT", that._getDBPath());
							oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
							oRequest.addEventListener("load", function () {
								MessageToast.show("Datenbank wurde erstellt.");
								resolve();
							});
							oRequest.send();
						}
					});
				});

				// check that the valid values are present, copy them from local json file to DB if required
				var oValidValuesCreated = new Promise(function (resolve) {
					oDBCreated.then(function() {
						var oValidValuesModel = new JSONModel(that._getDBPath() + "validValues");
						oValidValuesModel.attachRequestCompleted(function (oEvent) {
							if (oEvent.getParameter("success")) {
								resolve();
							} else {
								var oLocalValidValuesModel = new JSONModel("./model/validValues.json");
								oLocalValidValuesModel.attachRequestCompleted(function () {
									that.putDocument("validValues", "validValues", oLocalValidValuesModel.getObject("/")).then(function() {
										MessageToast.show("Datenbank wurde initialisiert.");
										resolve();
									});
								});
							}
						});
					});
				});

				// check that all views are installed
				Promise.all([oDBCreated, oValidValuesCreated]).then(function () {
					var oDBViewsModel = new JSONModel(that._getDBPath() + "_design/docs");
					oDBViewsModel.attachRequestCompleted(function (oEvent) {
						var bSuccess = oEvent.getParameter("success");
						var oLocalViewsModel = new JSONModel("./model/dbViews.json");
						oLocalViewsModel.attachRequestCompleted(function () {
							// if the views could not be retrieved, an update is required
							var bUpdateRequired = !bSuccess;
							var sRevision = "";
							var oLocalViews = oLocalViewsModel.getObject("/");
							if (bSuccess) {
								// if the views were retrieved, check if all views exist
								var aLocalViewNames = Object.getOwnPropertyNames(oLocalViews.views);
								var aDBViewNames = Object.getOwnPropertyNames(oDBViewsModel.getObject("/views"));
								for (var i = 0; i < aLocalViewNames.length; i++) {
									var oView = oLocalViews.views[aLocalViewNames[i]];
									if (oView.forceUpdate || aDBViewNames.indexOf(aLocalViewNames[i]) < 0) {
										bUpdateRequired = true;
										sRevision = "?rev=" + oDBViewsModel.getObject("/")._rev;
									}
									delete oView.forceUpdate;
								}
							}

							if (bUpdateRequired) {
								var oRequest = new XMLHttpRequest();
								oRequest.open("PUT", that._getDBPath() + "_design/docs" + sRevision);
								oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
								oRequest.addEventListener("load", function () {
									sap.m.MessageToast.show("Views wurden erstellt.");
									var mModels = that.getManifestEntry("sap.ui5").models;
									var aModelNames = Object.getOwnPropertyNames(mModels);
									for (var i = 0; i < aModelNames.length; i++) {
										if (mModels[aModelNames[i]].uri && mModels[aModelNames[i]].uri.indexOf("couchDB") === 0) {
											that.reloadModel(aModelNames[i]);
										}
									}
								});
								oRequest.send(JSON.stringify(oLocalViews));
							}
						});
					});
				});
			},

			compareStringAsInt: function (sValue1, sValue2) {
				var iReturn;
				if (parseInt(sValue1, 10) < parseInt(sValue2, 10)) {
					iReturn = -1;
				}
				if (parseInt(sValue1, 10) == parseInt(sValue2, 10)) {
					iReturn = 0;
				}
				if (parseInt(sValue1, 10) > parseInt(sValue2, 10)) {
					iReturn = 1;
				}
				return iReturn;
			},

			findEntity: function (oModel, sListPath, fnCompare) {
				if (typeof oModel === "string") {
					oModel = this.getModel(oModel);
					if (!oModel) {
						throw "Model not found";
					}
				}
				var aList = oModel.getObject(sListPath);
				var mResult;
				if (typeof aList === "object") {
					jQuery.each(aList, function (sKey, mValue) {
						if (fnCompare(mValue)) {
							mResult = mValue;
							return false;
						}
					})
				}
				return mResult;
			}
		});
	});
