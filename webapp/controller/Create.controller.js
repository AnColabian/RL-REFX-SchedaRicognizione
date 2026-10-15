sap.ui.define([
    "schedaricognizione/controller/BaseController",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "schedaricognizione/model/models"
], (BaseController, History, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, models) => {
    "use strict";
    return BaseController.extend("schedaricognizione.controller.Create", {
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
            this._applyTableRowLimit("create", "/risultatiOA", "tableOA");
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
                this.byId("tableOA").clearSelection();
            }
            if (this.byId("tableOASelected")) {
                this.byId("tableOASelected").clearSelection();
            }
            this._bCreateSaved = false;
            this._resetCreateValidation();
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
            return this._createEmptySchedaData();
        },
        _loadTemplateHelp: function () {
            var oCreateModel = this.getView().getModel("create");
            var iRouteRequest = this._iCreateRouteRequest;
            return this._readHelpScheda().then(function (aResults) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    oCreateModel.setSizeLimit(Math.max(
                        100,
                        aResults.length,
                        (oCreateModel.getProperty("/risultatiOA") || []).length,
                        (oCreateModel.getProperty("/posizioniSelezionate") || []).length
                    ));
                    oCreateModel.setProperty("/helpScheda", aResults);
                }
                return aResults;
            }.bind(this));
        },
        _mapSchedaDetailToCreateModel: function (oData) {
            return this._mapSchedaDetailToFormModel(oData, {
                preserveId: false,
                preserveState: false,
                preserveModelId: false,
                preserveDate: false
            });
        },

        onCreateWithoutTemplate: function () {
            var oCreateModel = this.getView().getModel("create");
            oCreateModel.setProperty("/scheda", this._createEmptyScheda());
            oCreateModel.setProperty("/posizioniSelezionate", []);
            this._applyTableRowLimit("create", "/posizioniSelezionate", "tableOASelected");
            this._resetCreateValidation();
            this.getView().getModel("templateSelection").setData({ idScheda: "", text: "" });
            this.byId("comboTemplateScheme").setValue("");
            this.byId("dialogImportTemplate").close();
        },
        _onCreateBeforeHide: function () {
            this._bCreateViewVisible = false;
            ["dialogImportTemplate", "dialogHelpSchedaModel", "dialogHelpUEco", "dialogHelpTerr", "dialogHelpEdif"].forEach(function (sId) {
                var oControl = this.byId(sId);
                if (oControl && typeof oControl.close === "function" && oControl.isOpen && oControl.isOpen()) {
                    oControl.close();
                }
            }, this);
        },
        _loadCreateFragment: function (sFragmentName) {
            return this._loadViewFragment(sFragmentName);
        },
        onTemplateValueHelp: function () {
            var iRouteRequest = this._iCreateRouteRequest;
            this._loadCreateFragment("HelpSchedaModel").then(function (oDialog) {
                if (!this._bCreateViewVisible || this._iCreateRouteRequest !== iRouteRequest) {
                    return;
                }
                if (oDialog.getBusy()) {
                    return;
                }
                oDialog.getBinding("items").filter([]);
                this.getView().getModel("create").setProperty("/helpScheda", []);
                oDialog.setBusyIndicatorDelay(0);
                oDialog.setBusy(true);
                this._loadTemplateHelp().catch(function (oError) {
                    if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                        MessageBox.error("Impossibile caricare le Schede Modello.", {
                            details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                        });
                    }
                }.bind(this)).finally(function () {
                    if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                        oDialog.setBusy(false);
                    }
                }.bind(this));
                oDialog.open("");
            }.bind(this)).catch(function (oError) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile aprire il ValueHelp della Scheda Modello.", {
                        details: oError && oError.message ? oError.message : String(oError)
                    });
                }
            }.bind(this));
        },
        onSearchHelpSchedaModel: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
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
            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmHelpSchedaModel: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
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
        },
        onCloseHelpSchedaModel: function () {
            var oDialog = this.byId("dialogHelpSchedaModel");
            if (oDialog) {
                oDialog.close();
            }
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
                this._resetCreateValidation();
                var oPositionsTable = this.byId("tableOASelected");
                if (oPositionsTable) {
                    oPositionsTable.clearSelection();
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
        _mapTemplatePositions: function (aPositions) {
            return this._mapSchedaPositions(aPositions, "99999999");
        },
        _mergeSelectedPositions: function (aPositionsToAdd) {
            var iAdded = BaseController.prototype._mergeSelectedPositions.call(this, "create", "/posizioniSelezionate", "tableOASelected", aPositionsToAdd);
            var oCreateModel = this.getView().getModel("create");
            var aResults = oCreateModel.getProperty("/risultatiOA") || [];
            var aHelpScheda = oCreateModel.getProperty("/helpScheda") || [];
            var aPositions = oCreateModel.getProperty("/posizioniSelezionate") || [];
            oCreateModel.setSizeLimit(Math.max(
                100,
                aPositions.length,
                aResults.length,
                aHelpScheda.length
            ));
            return iAdded;
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
                    this._applyTableRowLimit("create", "/risultatiOA", "tableOA");
                    if (this.byId("tableOA")) {
                        this.byId("tableOA").clearSelection();
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
            ].concat(aAdditionalFilters || []);
            return this._readOData(sEntitySetPath, {
                filters: aFilters
            }).then(function (oData) {
                var aResults = oData && Array.isArray(oData.results) ? oData.results : [];
                var oModel = this.getView().getModel(sModelName);
                oModel.setSizeLimit(Math.max(100, aResults.length));
                oModel.setData(aResults);
                return aResults;
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
                this.byId("tableOA").clearSelection();
            }
        },
        onRemoveOA: function () {
            this.onRemoveSelectedPositions();
        },
        onNavBack: function () {
            this.onCancel();
        },
        onCancel: function () {
            if (this._bSavingScheda) {
                return;
            }
            MessageBox.confirm("Sei sicuro di voler annullare? I dati non salvati andranno persi.", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._navToMain();
                    }
                }.bind(this)
            });
        },
        onAddSelectedPositions: function () {
            var oTable = this.byId("tableOA");
            var oPositionsTable = this.byId("tableOASelected");

            if (oTable.getBusy() || this._bSavingScheda || this._bCreateSaved) {
                return;
            }

            var aSelectedIndices = oTable.getSelectedIndices();
            if (aSelectedIndices.length === 0) {
                MessageToast.show("Selezionare almeno un Oggetto Architettonico da aggiungere.");
                return;
            }

            var oCreateModel = this.getView().getModel("create");
            var aCurrentPositions = oCreateModel.getProperty("/posizioniSelezionate") || [];
            var oKnownIds = new Set(aCurrentPositions.map(function (oPosition) {
                return String(oPosition.idOggArch || "").trim();
            }));
            var aMissingObjects = [];

            try {
                aSelectedIndices.forEach(function (iIndex) {
                    var oContext = oTable.getContextByIndex(iIndex);
                    if (!oContext) {
                        throw new Error("Una delle righe selezionate non è disponibile. Ripetere la selezione.");
                    }

                    var oObject = oContext.getObject();
                    var sIdOA = String(oObject.idOggArch || "").trim();

                    if (!sIdOA) {
                        throw new Error("Una delle righe selezionate non contiene un ID OA valido.");
                    }

                    if (!oKnownIds.has(sIdOA)) {
                        oKnownIds.add(sIdOA);
                        aMissingObjects.push(Object.assign({}, oObject));
                    }
                });
            } catch (oError) {
                MessageBox.warning(oError.message);
                return;
            }

            if (aMissingObjects.length === 0) {
                oTable.clearSelection();
                MessageToast.show("Gli Oggetti Architettonici selezionati sono già presenti nelle Posizioni correnti.");
                return;
            }

            var iRouteRequest = this._iCreateRouteRequest;
            oTable.setBusyIndicatorDelay(0);
            oTable.setBusy(true);
            oPositionsTable.setBusyIndicatorDelay(0);
            oPositionsTable.setBusy(true);

            return Promise.all(aMissingObjects.map(function (oOA) {
                return this._readPosizioneDetail(oOA);
            }, this)).then(function (aDetails) {
                if (!this._bCreateViewVisible || this._iCreateRouteRequest !== iRouteRequest) {
                    return;
                }

                var aPositions = this._mapTemplatePositions(aDetails);
                var iAdded = this._mergeSelectedPositions(aPositions);

                oTable.clearSelection();
                MessageToast.show("Posizioni aggiunte: " + iAdded + ".");
            }.bind(this)).catch(function (oError) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile completare l'aggiunta delle Posizioni. Nessuna nuova posizione è stata aggiunta.", {
                        details: oError && (oError.responseText || oError.message)
                            ? oError.responseText || oError.message
                            : String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    oTable.setBusy(false);
                    oPositionsTable.setBusy(false);
                }
            }.bind(this));
        },
        onRemoveSelectedPositions: function () {
            var bRemoved = BaseController.prototype._removeSelectedPositions.call(this, "create", "/posizioniSelezionate", "tableOASelected");
            if (!bRemoved) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgNoOAToRemove"));
            }
        },
        _getRequiredTestataFields: function () {
            return BaseController.prototype._getRequiredTestataFields.call(this, "panelTestata");
        },
        onRequiredTestataChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = (oInput.getValue() || "").trim();

            if (sValue !== "") {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }

            if (oInput.getId().indexOf("inputSupCop") !== -1 || oInput.getId().indexOf("inputSupScop") !== -1) {
                var oSupCop = this.byId("inputSupCop");
                var oSupScop = this.byId("inputSupScop");
                var fSupCop = this.formatter.parseNumericValue(oSupCop ? oSupCop.getValue() : "");
                var fSupScop = this.formatter.parseNumericValue(oSupScop ? oSupScop.getValue() : "");
                var bSurfacePairValid = fSupCop > 0 || fSupScop > 0;

                if (bSurfacePairValid) {
                    oSupCop.setValueState("None");
                    oSupCop.setValueStateText("");
                    oSupScop.setValueState("None");
                    oSupScop.setValueStateText("");
                }
            }
        },
        _resetCreateValidation: function () {
            BaseController.prototype._resetSchedaValidation.call(this, "panelTestata", ["inputSupCop", "inputSupScop"]);
        },
        _validateCreateBeforeSave: function () {
            return BaseController.prototype._validateSchedaBeforeSave.call(this, {
                panelId: "panelTestata",
                positionsModelName: "create",
                positionsPath: "/posizioniSelezionate",
                panelOAId: "panelOA",
                surfaceFieldIds: ["inputSupCop", "inputSupScop"]
            });
        },
        onSaveDraft: function () {
            this._saveNewScheda("B");
        },
        onSaveFinal: function () {
            this._saveNewScheda("D");
        },
        _buildCreatePayload: function (sStato) {
            var oModel = this.getView().getModel("create");
            var oHeader = Object.assign({}, oModel.getProperty("/scheda"), {
                idScheda: "99999999"
            });
            return this._buildSchedaPayload(
                oHeader,
                oModel.getProperty("/posizioniSelezionate") || [],
                sStato,
                Object.keys(this._createEmptyScheda())
            );
        },
        _postNewScheda: function (oPayload) {
            return this._postScheda(oPayload);
        },

        _saveNewScheda: function (sStato) {
            if (this._bSavingScheda || this._bCreateSaved) {
                return;
            }
            if (!this._validateCreateBeforeSave()) {
                return;
            }

            var oPayload;
            try {
                oPayload = this._buildCreatePayload(sStato);
            } catch (oError) {
                MessageBox.warning(oError.message);
                return;
            }

            this._bSavingScheda = true;
            var oView = this.getView();
            var iRouteRequest = this._iCreateRouteRequest;
            oView.setBusy(true);

            this._postNewScheda(oPayload).then(function (oData) {
                if (!this._bCreateViewVisible || this._iCreateRouteRequest !== iRouteRequest) {
                    return;
                }
                this._bCreateSaved = true;
                var sMessage = sStato === "B"
                    ? "Scheda salvata in stato Provvisorio."
                    : "Scheda rilasciata in stato Definitivo.";
                if (oData && oData.idScheda) {
                    sMessage += "\nNumero scheda: " + oData.idScheda;
                }
                MessageBox.success(sMessage, {
                    onClose: function () {
                        if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                            this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
                        }
                    }.bind(this)
                });
            }.bind(this)).catch(function (oError) {
                if (this._bCreateViewVisible && this._iCreateRouteRequest === iRouteRequest) {
                    MessageBox.error("Salvataggio della Scheda Ricognizione non riuscito.", {
                        details: oError && (oError.responseText || oError.message)
                            ? oError.responseText || oError.message
                            : String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                this._bSavingScheda = false;
                oView.setBusy(false);
            }.bind(this));
        },

    });
});
