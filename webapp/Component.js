sap.ui.define([
		"sap/ui/core/UIComponent",
		"sap/ui/core/routing/History",
		"./model/formatter"],
	function (UIComponent, History, Formatter) {
		"use strict";
		return UIComponent.extend('glw.Component', {
			metadata: {
				manifest: "json"
			},
			_allowedTypes: ["container", "schnaps", "productCategory", "validValues", "storageBin", "stock"],

			init: function () {
				// call the init function of the parent
				UIComponent.prototype.init.apply(this, arguments);
				this._initModelPromises();
				this.models.validValues.loaded.then(this._checkAndInstallValidValues.bind(this));

				this.models.stock.model.attachRequestCompleted(this._stockChangedHandler.bind(this));

				this.getRouter().initialize();
			},

			_initModelPromises: function () {
				var that = this;
				var fnGetPromise = function (sModelName) {
					return new Promise(function (resolve) {
						that.models[sModelName].model.attachRequestCompleted(function () {
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
			}
			,

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
					oRequest.open("POST", "couchDB/glw");
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", fnSuccess);
					oRequest.addEventListener("error", fnError);
					oRequest.send(sBody);
				});
			}
			,

			putDocument: function (sId, sType, oDocument) {
				var sRevision;
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
					oRequest.open("PUT", "couchDB/glw/" + sId + sRevision);
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", fnSuccess);
					oRequest.addEventListener("error", fnError);
					oRequest.send(sBody);
				});
			}
			,

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
					oRequest.open("DELETE", "couchDB/glw/" + sId + "?rev=" + sRevision);
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", fnSuccess);
					oRequest.addEventListener("error", fnError);
					oRequest.send();
				});
			}
			,

			reloadModel: function (sModelName) {
				var sProductModelUri = this.getManifestEntry("sap.ui5").models[sModelName].uri;
				this.getModel(sModelName).loadData(sProductModelUri);
			}
			,

			_stockChangedHandler: function () {
				Promise.all([this.models.productCategories.loaded, this.models.container.loaded, this.models.stock.loaded]).then(function () {
					var oModel = this.getModel("stock");
					var aStock = oModel.getObject("/rows");
					var oAggregatedStock = {};
					var iTotal = 0;
					
					var aProductCategories = this.getModel("productCategories").getObject("/rows");
					var aContainer = this.getModel("container").getObject("/rows");
					var oYears = {};
					for (var i = 0; i < aStock.length; i++) {
						var oStock = aStock[i].value;
						var sKey = oStock.productCategory + "_" + new Date(oStock.batch).getFullYear() + "_" + oStock.numberUnit;
						if (!oAggregatedStock[sKey]) {
							oAggregatedStock[sKey] = {
								productCategory: oStock.productCategory,
								productCategoryName: Formatter.formatProductCategory(oStock.productCategory, aProductCategories),
								batch: new Date(oStock.batch),
								year: new Date(oStock.batch).getFullYear(),
								quantity: 0,
								numberUnit: oStock.numberUnit,
								rows: []
							};
						}

						if (!oYears[oAggregatedStock[sKey].year]) {
							oYears[oAggregatedStock[sKey].year] = {year: oAggregatedStock[sKey].year};
						}
						oAggregatedStock[sKey].quantity += oStock.quantity;
						iTotal += oStock.quantity;
						aStock[i].value.containerName = Formatter.formatProductCategoryByContainerBarCode(oStock.container, aContainer, aProductCategories);
						aStock[i].value.productCategoryName = oAggregatedStock[sKey].productCategoryName;
						aStock[i].value.batch = aStock[i].value.batch && new Date(aStock[i].value.batch);
						aStock[i].value.year = oAggregatedStock[sKey].year;
						oAggregatedStock[sKey].rows.push(oStock);
					}

					oModel.setProperty("/aggregatedStock", oAggregatedStock);
					oModel.setProperty("/totalLiters", iTotal);
					oModel.setProperty("/years", oYears);
					oModel.setProperty("/totalCount", Object.getOwnPropertyNames(oAggregatedStock).length);

					oModel.setProperty("/rows", aStock);
				}.bind(this));
			},

			_checkAndInstallValidValues: function () {
				var oModel = this.getModel("validValues");
				oModel.detachRequestCompleted(this._validValuesHandler);
				var that = this;
				if (jQuery.isEmptyObject(oModel.getObject("/"))) {
					// create DB
					var oRequest = new XMLHttpRequest();
					oRequest.open("PUT", "couchDB/glw/");
					oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
					oRequest.addEventListener("load", function () {
						jQuery.sap.log.warning("DB glw created.");
						sap.m.MessageToast.show("Datenbank erstellt.");

						// create valid values
						oModel.loadData("./model/validValues.json", "", false);
						that.putDocument("validValues", "validValues", oModel.getObject("/"));

						// create views
						var oDBViewModel = new sap.ui.model.json.JSONModel();
						oDBViewModel.loadData("./model/dbViews.json", "", false);
						oRequest = new XMLHttpRequest();
						oRequest.open("PUT", "couchDB/glw/_design/docs");
						oRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
						oRequest.addEventListener("load", function () {
							jQuery.sap.log.warning("Views created.");
							sap.m.MessageToast.show("Views wurden erstellt.");

							var mModels = that.getManifestEntry("sap.ui5").models;
							var aModelNames = Object.getOwnPropertyNames(mModels);
							for (var i = 0; i < aModelNames.length; i++) {
								if (mModels[aModelNames[i]].uri && mModels[aModelNames[i]].uri.indexOf("couchDB") === 0) {
									that.reloadModel(aModelNames[i]);
								}
							}
						});

						oRequest.send(JSON.stringify(oDBViewModel.getObject("/")));
					});

					oRequest.send();
				}
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
