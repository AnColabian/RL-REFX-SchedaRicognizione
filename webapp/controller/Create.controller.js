sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "schedaricognizione/model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "schedaricognizione/model/models"
], (Controller, History, MessageBox, MessageToast, formatter, JSONModel, Filter, FilterOperator, models) => {
    "use strict";
    return Controller.extend("schedaricognizione.controller.Create", {
        formatter: formatter,
        onInit: function () {
            this.getView().setModel(new JSONModel({
                scheda: this._createEmptyScheda(),
                helpScheda: [],
                risultatiOA: [],
                posizioniSelezionate: [],
                filters: {
                    uEco: "",
                    terr: "",
                    edif: ""
                }
            }), "create");
            this.getView().setModel(new JSONModel([]), "helpUEco");
            this.getView().setModel(new JSONModel([]), "helpTerr");
            this.getView().setModel(new JSONModel([]), "helpEdif");
            this.getView().setModel(new JSONModel({ idScheda: "", text: "" }), "templateSelection");
            this._mCreateFragments = {};
            this._oNavigationDelegate = {
                onBeforeHide: this._onCreateBeforeHide
            };
            this.getView().addEventDelegate(this._oNavigationDelegate, this);
            this.getOwnerComponent().getRouter().getRoute("RouteCreate").attachPatternMatched(this._onCreateRouteMatched, this);
        },
        _onCreateRouteMatched: function () {
            this._bCreateViewVisible = true;
            this._iCreateRouteRequest = (this._iCreateRouteRequest || 0) + 1;
            var iRouteRequest = this._iCreateRouteRequest;
            var oCreateModel = this.getView().getModel("create");
            oCreateModel.setProperty("/scheda", this._createEmptyScheda());
            oCreateModel.setProperty("/helpScheda", []);
            oCreateModel.setProperty("/risultatiOA", []);
            oCreateModel.setProperty("/posizioniSelezionate", []);
            this._applyTableRowLimit("create", "/posizioniSelezionate", "tableOASelected");
            oCreateModel.setProperty("/filters", {
                uEco: "",
                terr: "",
                edif: ""
            });
            this.getView().getModel("helpUEco").setData([]);
            this.getView().getModel("helpTerr").setData([]);
            this.getView().getModel("helpEdif").setData([]);
            this.getView().getModel("templateSelection").setData({ idScheda: "", text: "" });
            if (this.byId("tableOA")) {
                this.byId("tableOA").removeSelections(true);
            }
            if (this.byId("tableOASelected")) {
                this.byId("tableOASelected").clearSelection();
            }
            this._loadCreateFragment("ImportTemplate").then(function (oDialog) {
                if (!this._bCreateViewVisible || this._iCreateRouteRequest !== iRouteRequest) {
                    return;
                }
                this.byId("comboTemplateScheme").setValue("");
                oDialog.setBusy(false);
                oDialog.open();
            }.bind(this)).catch(function (oError) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile aprire la selezione della Scheda Modello.", {
                        details: oError && oError.message ? oError.message : String(oError)
                    });
                }
            }.bind(this));
        },
        _createEmptyScheda: function () {
            return {
                idScheda: "99999999",
                stato: "",
                idSchModel: "",
                dtCompil: this._getCurrentDate(),
                via: "",
                numCivico: "",
                cap: "",
                localita: "",
                provincia: "",
                docValorizz: "",
                idBene: "",
                entePropr: "",
                denomBene: "",
                coorGIS: "",
                tipologia: "",
                usoEdif: "",
                usoTerr: "",
                supLU: "",
                supFond: "",
                accessib: "",
                porzEdif: "",
                numEdif: "",
                numLivFuo: "",
                numLivEnt: "",
                collegam: "",
                strPort: "",
                tampon: "",
                copert: "",
                serram: "",
                partInt: "",
                finiture: "",
                impianti: "",
                pertin: "",
                supCop: "",
                supScop: "",
                zonOMI: "",
                presApe: "",
                clsEnerg: "",
                titProv: "",
                annoAcquis: "",
                attiLimit: "",
                annoCostr: "",
                stGener: "",
                stStrPort: "",
                stCopert: "",
                stTampon: "",
                stChiusEst: "",
                stInter: "",
                stFinit: "",
                stImpian: "",
                stConsNote: "",
                stOccup: "",
                soggOccup: "",
                natOccup: "",
                tipOccup: "",
                vincoli: "",
                intCultMIB: "",
                autMibAli: "",
                destUrb: "",
                iterUrb: "",
                titOrig: "",
                ante67: "",
                ante42: "",
                corrCat: "",
                certAgib: "",
                collStat: "",
                docAmbien: "",
                vulnRSism: "",
                vulnRIdro: "",
                stimaVal: "",
                stimaNote: "",
                annoValor: "",
                canLocaz: "",
                progPrec: "",
                delinInsPDA: "",
                garaVend: "",
                esitoAsta: ""
            };
        },
        _loadTemplateHelp: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            var oCreateModel = this.getView().getModel("create");
            var iRouteRequest = this._iCreateRouteRequest;
            return new Promise(function (resolve, reject) {
                if (!oODataModel || typeof oODataModel.read !== "function") {
                    reject(new Error("Modello OData V2 non disponibile."));
                    return;
                }
                oODataModel.read("/helpScheda", {
                    success: function (oData) {
                        try {
                            var aResults = oData && Array.isArray(oData.results) ? oData.results : [];
                            if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                                oCreateModel.setSizeLimit(Math.max(100, aResults.length));
                                oCreateModel.setProperty("/helpScheda", aResults);
                            }
                            resolve(aResults);
                        } catch (oError) {
                            reject(oError);
                        }
                    }.bind(this),
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }.bind(this));
        },
        _readSchedaDetail: function (sIdScheda) {
            var oODataModel = this.getOwnerComponent().getModel();
            return new Promise(function (resolve, reject) {
                if (!oODataModel || typeof oODataModel.read !== "function") {
                    reject(new Error("Modello OData V2 non disponibile."));
                    return;
                }
                if (!sIdScheda) {
                    reject(new Error("ID Scheda Modello non valorizzato."));
                    return;
                }
                try {
                    if (!oODataModel.getServiceMetadata()) {
                        throw new Error("Metadata OData non disponibile. Ricaricare l'applicazione.");
                    }
                    var sPath = "/" + oODataModel.createKey("scheda", {
                        idScheda: sIdScheda
                    });
                    oODataModel.read(sPath, {
                        urlParameters: {
                            "$expand": "toPosizioni"
                        },
                        success: function (oData) {
                            if (!oData || oData.idScheda !== sIdScheda) {
                                reject(new Error("Il servizio non ha restituito il dettaglio della scheda richiesta."));
                                return;
                            }
                            resolve(oData);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                } catch (oError) {
                    reject(oError);
                }
            });
        },
        _mapSchedaDetailToCreateModel: function (oData) {
            var oScheda = this._createEmptyScheda();
            Object.keys(oScheda).forEach(function (sProperty) {
                if (Object.prototype.hasOwnProperty.call(oData, sProperty) && oData[sProperty] !== null && oData[sProperty] !== undefined) {
                    oScheda[sProperty] = oData[sProperty];
                }
            });
            oScheda.idScheda = "99999999";
            oScheda.stato = "";
            oScheda.idSchModel = oData.idScheda || "";
            oScheda.dtCompil = this._getCurrentDate();
            ["supLU", "supFond", "supCop", "supScop", "stimaVal"].forEach(function (sProperty) {
                oScheda[sProperty] = this.formatter.normalizeDecimalValue(oScheda[sProperty]);
            }, this);
            ["numEdif", "numLivFuo", "numLivEnt", "annoValor"].forEach(function (sProperty) {
                oScheda[sProperty] = this.formatter.normalizeIntegerLikeValue(oScheda[sProperty]);
            }, this);
            return oScheda;
        },

        onCreateWithoutTemplate: function () {
            var oCreateModel = this.getView().getModel("create");
            oCreateModel.setProperty("/scheda", this._createEmptyScheda());
            oCreateModel.setProperty("/posizioniSelezionate", []);
            this._applyTableRowLimit("create", "/posizioniSelezionate", "tableOASelected");
            this.getView().getModel("templateSelection").setData({ idScheda: "", text: "" });
            this.byId("comboTemplateScheme").setValue("");
            this.byId("dialogImportTemplate").close();
        },
        _onCreateBeforeHide: function () {
            this._bCreateViewVisible = false;
            ["dialogImportTemplate", "dialogHelpSchedaModel", "dialogHelpUEco", "dialogHelpTerr", "dialogHelpEdif"].forEach(function (sId) {
                var oDialog = this.byId(sId);
                if (oDialog) {
                    oDialog.close();
                }
            }, this);
        },
        _loadCreateFragment: function (sFragmentName) {
            if (!this._mCreateFragments[sFragmentName]) {
                this._mCreateFragments[sFragmentName] = this.loadFragment({
                    name: "schedaricognizione.view.fragment." + sFragmentName
                }).catch(function (oError) {
                    delete this._mCreateFragments[sFragmentName];
                    throw oError;
                }.bind(this));
            }
            return this._mCreateFragments[sFragmentName];
        },
        onTemplateValueHelp: function () {
            var iRouteRequest = this._iCreateRouteRequest;
            this._loadCreateFragment("HelpSchedaModel").then(function (oDialog) {
                if (!this._bCreateViewVisible || this._iCreateRouteRequest !== iRouteRequest) {
                    return;
                }
                var oTable = this.byId("tableHelpSchedaModel");
                if (oTable.getBusy()) {
                    return;
                }
                this.byId("searchFieldHelpSchedaModel").setValue("");
                oTable.removeSelections(true);
                oTable.getBinding("items").filter([]);
                this.getView().getModel("create").setProperty("/helpScheda", []);
                oTable.setBusyIndicatorDelay(0);
                oTable.setBusy(true);
                oDialog.open();
                this._loadTemplateHelp().catch(function (oError) {
                    if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                        MessageBox.error("Impossibile caricare le Schede Modello.", {
                            details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                        });
                    }
                }.bind(this)).finally(function () {
                    if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                        oTable.setBusy(false);
                    }
                }.bind(this));
            }.bind(this)).catch(function (oError) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile aprire il ValueHelp della Scheda Modello.", {
                        details: oError && oError.message ? oError.message : String(oError)
                    });
                }
            }.bind(this));
        },
        onSearchHelpSchedaModel: function (oEvent) {
            var sValue = (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("idSchMdl", FilterOperator.Contains, sValue),
                        new Filter("stato", FilterOperator.Contains, sValue),
                        new Filter("docVal", FilterOperator.Contains, sValue),
                        new Filter("idBene", FilterOperator.Contains, sValue),
                        new Filter("denBene", FilterOperator.Contains, sValue),
                        new Filter("autore", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            this.byId("tableHelpSchedaModel").getBinding("items").filter(aFilters);
        },
        onConfirmHelpSchedaModel: function () {
            var oSelectedItem = this.byId("tableHelpSchedaModel").getSelectedItem();
            if (!oSelectedItem) {
                MessageBox.error("Selezionare una scheda modello.");
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("create").getObject();
            if (!oSelectedObject.idScheda) {
                MessageBox.error("La scheda selezionata non contiene un ID valido.");
                return;
            }
            var sText = oSelectedObject.idScheda;
            if (oSelectedObject.denBene) {
                sText += " - " + oSelectedObject.denBene;
            }
            this.getView().getModel("templateSelection").setData({
                idScheda: oSelectedObject.idScheda,
                text: sText
            });
            this.byId("comboTemplateScheme").setValue(sText);
            this.byId("dialogHelpSchedaModel").close();
        },
        onCloseHelpSchedaModel: function () {
            this.byId("dialogHelpSchedaModel").close();
        },
        onImportTemplate: function () {
            var sIdScheda = this.getView().getModel("templateSelection").getProperty("/idScheda");
            var oDialog = this.byId("dialogImportTemplate");
            var iRouteRequest = this._iCreateRouteRequest;
            if (oDialog.getBusy()) {
                return;
            }
            if (!sIdScheda) {
                MessageBox.error("Selezionare una scheda modello.");
                return;
            }
            oDialog.setBusyIndicatorDelay(0);
            oDialog.setBusy(true);
            this._readSchedaDetail(sIdScheda).then(function (oDetail) {
                if (!this._bCreateViewVisible || this._iCreateRouteRequest !== iRouteRequest) {
                    return;
                }
                var aSourcePositions = oDetail.toPosizioni && oDetail.toPosizioni.results;
                if (!Array.isArray(aSourcePositions)) {
                    throw new Error("La risposta non contiene la raccolta toPosizioni espansa.");
                }
                var oScheda = this._mapSchedaDetailToCreateModel(oDetail);
                var aPositions = this._mapTemplatePositions(aSourcePositions);
                var oCreateModel = this.getView().getModel("create");
                oCreateModel.setSizeLimit(Math.max(100, aPositions.length, (oCreateModel.getProperty("/helpScheda") || []).length));
                oCreateModel.setProperty("/scheda", oScheda);
                oCreateModel.setProperty("/posizioniSelezionate", aPositions);
                this._applyTableRowLimit("create", "/posizioniSelezionate", "tableOASelected");
                var oPositionsTable = this.byId("tableOASelected");
                if (oPositionsTable) {
                    oPositionsTable.clearSelection(true);
                }
                oDialog.close();
            }.bind(this)).catch(function (oError) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile importare la Scheda Modello.", {
                        details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    oDialog.setBusy(false);
                }
            }.bind(this));
        },
        _getDefaultSocieta: function () {
            return "1000";
        },
        _readPosizioneDetail: function (oOA) {
            return new Promise(function (resolve, reject) {
                var aFilters = [
                    new Filter("soc", FilterOperator.EQ, oOA.soc),
                    new Filter("uEco", FilterOperator.EQ, oOA.uEco),
                    new Filter("terr", FilterOperator.EQ, oOA.terr),
                    new Filter("edif", FilterOperator.EQ, oOA.edif),
                    new Filter("idOggArch", FilterOperator.EQ, oOA.idOggArch)
                ];
                this.getOwnerComponent().getModel().read("/posizioni", {
                    filters: aFilters,
                    success: function (oData) {
                        var aResults = (oData && oData.results) ? oData.results : [];
                        if (aResults.length > 0) {
                            resolve(aResults[0]);
                            return;
                        }
                        reject();
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }.bind(this));
        },
        _mapTemplatePositions: function (aPositions) {
            return aPositions.map(function (oItem) {
                return {
                    idScheda: "99999999",
                    chIntOA: oItem.chIntOA || "",
                    idOggArch: oItem.idOggArch || "",
                    objnrOA: oItem.objnrOA || "",
                    objnrUL: oItem.objnrUL || "",
                    chIntUL: oItem.chIntUL || "",
                    soc: oItem.soc || "",
                    uEco: oItem.uEco || "",
                    terr: oItem.terr || "",
                    edif: oItem.edif || "",
                    unitLocaz: oItem.unitLocaz || "",
                    numIndir: oItem.numIndir || "",
                    tpCatas: oItem.tpCatas || "",
                    tpEdTer: oItem.tpEdTer || "",
                    codBelf: oItem.codBelf || "",
                    foglio: oItem.foglio || "",
                    sezUrb: oItem.sezUrb || "",
                    partic: oItem.partic || "",
                    sub: oItem.sub || "",
                    denom: oItem.denom || "",
                    tpPart: oItem.tpPart || "",
                    codComCat: oItem.codComCat || ""
                };
            });
        },
        _mergeSelectedPositions: function (aPositionsToAdd) {
            var oCreateModel = this.getView().getModel("create");
            var aCurrentPositions = oCreateModel.getProperty("/posizioniSelezionate") || [];
            var bDuplicateFound = false;
            aPositionsToAdd.forEach(function (oPosition) {
                var bAlreadyPresent = aCurrentPositions.some(function (oCurrentItem) {
                    return oCurrentItem.idOggArch === oPosition.idOggArch && oCurrentItem.soc === oPosition.soc && oCurrentItem.uEco === oPosition.uEco && oCurrentItem.terr === oPosition.terr && oCurrentItem.edif === oPosition.edif;
                });
                if (bAlreadyPresent) {
                    bDuplicateFound = true;
                    return;
                }
                aCurrentPositions.push(oPosition);
            });
            oCreateModel.setProperty("/posizioniSelezionate", aCurrentPositions);
            this._applyTableRowLimit("create", "/posizioniSelezionate", "tableOASelected");
            if (bDuplicateFound) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgPositionAlreadyPresent"));
            }
        },
        onExit: function () {
            this._bCreateViewVisible = false;
            this.getOwnerComponent().getRouter().getRoute("RouteCreate").detachPatternMatched(this._onCreateRouteMatched, this);
            this.getView().removeEventDelegate(this._oNavigationDelegate);
            ["create", "templateSelection", "helpUEco", "helpTerr", "helpEdif"].forEach(function (sModelName) {
                var oModel = this.getView().getModel(sModelName);
                if (oModel) {
                    oModel.destroy();
                }
            }, this);
        },
        onSearchOA: function () {
            var aFilters = [
                new Filter("soc", FilterOperator.EQ, this._getDefaultSocieta())
            ];
            var sUEco = (this.getView().getModel("create").getProperty("/filters/uEco") || "").trim();
            var sTerr = (this.getView().getModel("create").getProperty("/filters/terr") || "").trim();
            var sEdif = (this.getView().getModel("create").getProperty("/filters/edif") || "").trim();
            if (sUEco) {
                aFilters.push(new Filter("uEco", FilterOperator.EQ, sUEco));
            }
            if (sTerr) {
                aFilters.push(new Filter("terr", FilterOperator.EQ, sTerr));
            }
            if (sEdif) {
                aFilters.push(new Filter("edif", FilterOperator.EQ, sEdif));
            }
            this.getOwnerComponent().getModel().read("/oggettiArch", {
                filters: aFilters,
                success: function (oData) {
                    var aResults = oData && oData.results ? oData.results : [];
                    this.getView().getModel("create").setProperty("/risultatiOA", aResults);
                    if (this.byId("tableOA")) {
                        this.byId("tableOA").removeSelections(true);
                    }
                }.bind(this),
                error: function (oError) {
                    MessageBox.error("Errore durante la ricerca degli Oggetti Architettonici.", {
                        details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                    });
                }
            });
        },
        _loadHelpValues: function (sEntitySetPath, aAdditionalFilters, sModelName) {
            var aFilters = [
                new Filter("soc", FilterOperator.EQ, this._getDefaultSocieta())
            ];
            (aAdditionalFilters || []).forEach(function (oFilter) {
                aFilters.push(oFilter);
            });
            return new Promise(function (resolve, reject) {
                this.getOwnerComponent().getModel().read(sEntitySetPath, {
                    filters: aFilters,
                    success: function (oData) {
                        var aResults = oData && oData.results ? oData.results : [];
                        this.getView().getModel(sModelName).setData(aResults);
                        resolve(aResults);
                    }.bind(this),
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }.bind(this));
        },
        _applyTableRowLimit: function (sModelName, sPath, sTableId) {
            var oTable = this.byId(sTableId);
            if (!oTable || !oTable.isA("sap.ui.table.Table")) {
                return;
            }
            var oModel = this.getView().getModel(sModelName);
            var aRows = oModel.getProperty(sPath) || [];
            oTable.setVisibleRowCountMode("Fixed");
            oTable.setVisibleRowCount(Math.max(1, Math.min(10, aRows.length)));
        },
        onValueHelpUEcoRequest: function () {
            this._loadHelpValues("/helpUEco", [], "helpUEco").then(function () {
                return this._loadCreateFragment("HelpUEco");
            }.bind(this)).then(function (oDialog) {
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }).catch(function () {
                MessageBox.error("Impossibile caricare l'help Unità Economica.");
            });
        },
        onValueHelpTerrRequest: function () {
            var sUEco = this.getView().getModel("create").getProperty("/filters/uEco");
            if (!sUEco) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgSelectUEcoFirst"));
                return;
            }
            this._loadHelpValues("/helpTerr", [new Filter("uEco", FilterOperator.EQ, sUEco)], "helpTerr").then(function () {
                return this._loadCreateFragment("HelpTerr");
            }.bind(this)).then(function (oDialog) {
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }).catch(function () {
                MessageBox.error("Impossibile caricare l'help Terreno.");
            });
        },
        onValueHelpEdifRequest: function () {
            var sUEco = this.getView().getModel("create").getProperty("/filters/uEco");
            var sTerr = this.getView().getModel("create").getProperty("/filters/terr");
            if (!sUEco) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgSelectUEcoFirst"));
                return;
            }
            if (!sTerr) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgSelectTerrFirst"));
                return;
            }
            this._loadHelpValues("/helpEdif", [
                new Filter("uEco", FilterOperator.EQ, sUEco),
                new Filter("edif", FilterOperator.Contains, "")
            ], "helpEdif").then(function (aResults) {
                var aFilteredResults = aResults.filter(function (oItem) {
                    return oItem.uEco === sUEco;
                });
                this.getView().getModel("helpEdif").setData(aFilteredResults);
                return this._loadCreateFragment("HelpEdif");
            }.bind(this)).then(function (oDialog) {
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }).catch(function () {
                MessageBox.error("Impossibile caricare l'help Edificio.");
            });
        },
        onSearchHelpUEco: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("uEco", FilterOperator.Contains, sValue),
                        new Filter("defUEco", FilterOperator.Contains, sValue),
                        new Filter("responsabile", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onSearchHelpTerr: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("terr", FilterOperator.Contains, sValue),
                        new Filter("defTerr", FilterOperator.Contains, sValue),
                        new Filter("tipoUso", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onSearchHelpEdif: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("edif", FilterOperator.Contains, sValue),
                        new Filter("oggEdif", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmHelpUEco: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("helpUEco").getObject();
            var oCreateModel = this.getView().getModel("create");
            oCreateModel.setProperty("/filters/uEco", oSelectedObject.uEco || "");
            oCreateModel.setProperty("/filters/terr", "");
            oCreateModel.setProperty("/filters/edif", "");
        },
        onConfirmHelpTerr: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("helpTerr").getObject();
            var oCreateModel = this.getView().getModel("create");
            oCreateModel.setProperty("/filters/terr", oSelectedObject.terr || "");
            oCreateModel.setProperty("/filters/edif", "");
        },
        onConfirmHelpEdif: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("helpEdif").getObject();
            this.getView().getModel("create").setProperty("/filters/edif", oSelectedObject.edif || "");
        },
        onSelectAllOA: function () {
            var oTable = this.byId("tableOA");
            if (oTable) {
                oTable.selectAll();
            }
        },
        onDeselectAllOA: function () {
            var oTable = this.byId("tableOA");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },
        onRemoveOA: function () {
            this.onRemoveSelectedPositions();
        },

        onCancel: function () {
            MessageBox.confirm("Sei sicuro di voler annullare? I dati non salvati andranno persi.", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
                    }
                }.bind(this)
            });
        },
        _getCurrentDate: function () {
            var oDate = new Date();
            var iYear = oDate.getFullYear();
            var iMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
            var iDay = ("0" + oDate.getDate()).slice(-2);
            return iYear + iMonth + iDay;
        },
        _getCurrentTime: function () {
            var oDate = new Date();
            var iHours = ("0" + oDate.getHours()).slice(-2);
            var iMinutes = ("0" + oDate.getMinutes()).slice(-2);
            var iSeconds = ("0" + oDate.getSeconds()).slice(-2);
            return iHours + iMinutes + iSeconds;
        },

        onAddSelectedPositions: function () {
            var oTable = this.byId("tableOA");
            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgNoOAToAdd"));
                return;
            }
            var aSelectedObjects = aSelectedItems.map(function (oItem) {
                return oItem.getBindingContext("create").getObject();
            });
            Promise.allSettled(aSelectedObjects.map(function (oItem) {
                return this._readPosizioneDetail(oItem);
            }.bind(this))).then(function (aResults) {
                var aLoadedPositions = [];
                var bHasErrors = false;
                aResults.forEach(function (oResult) {
                    if (oResult.status === "fulfilled" && oResult.value) {
                        aLoadedPositions.push(oResult.value);
                    } else {
                        bHasErrors = true;
                    }
                });
                this._mergeSelectedPositions(aLoadedPositions);
                oTable.removeSelections(true);
                if (bHasErrors) {
                    MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgPositionLoadPartialError"));
                }
            }.bind(this));
        },
        onRemoveSelectedPositions: function () {
            var oTable = this.byId("tableOASelected");
            var aSelectedIndices = oTable.getSelectedIndices();
            if (!aSelectedIndices || aSelectedIndices.length === 0) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgNoOAToRemove"));
                return;
            }
            var aCurrentPositions = this.getView().getModel("create").getProperty("/posizioniSelezionate") || [];
            var aKeysToRemove = aSelectedIndices.map(function (iIndex) {
                var oObject = oTable.getContextByIndex(iIndex).getObject();
                return oObject.idOggArch + "|" + oObject.soc + "|" + oObject.uEco + "|" + oObject.terr + "|" + oObject.edif;
            });
            var aRemainingPositions = aCurrentPositions.filter(function (oItem) {
                var sKey = oItem.idOggArch + "|" + oItem.soc + "|" + oItem.uEco + "|" + oItem.terr + "|" + oItem.edif;
                return aKeysToRemove.indexOf(sKey) === -1;
            });
            this.getView().getModel("create").setProperty("/posizioniSelezionate", aRemainingPositions);
            this._applyTableRowLimit("create", "/posizioniSelezionate", "tableOASelected");
            oTable.clearSelection();
        },

    });
});
