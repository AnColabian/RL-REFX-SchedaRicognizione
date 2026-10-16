sap.ui.define([
    "schedaricognizione/controller/BaseController",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, History, MessageBox, MessageToast, JSONModel, Filter, FilterOperator) => {
    "use strict";
    return BaseController.extend("schedaricognizione.controller.Edit", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                scheda: this._createEmptySchedaData(),
                helpScheda: [],
                risultatiOA: [],
                posizioniSelezionate: [],
                filters: {
                    uEco: "",
                    terr: "",
                    edif: ""
                }
            }), "edit");
            this.getView().setModel(new JSONModel([]), "helpUEco");
            this.getView().setModel(new JSONModel([]), "helpTerr");
            this.getView().setModel(new JSONModel([]), "helpEdif");
            this.getView().setModel(new JSONModel({
                idScheda: "",
                text: ""
            }), "editSelection");
            this._bEditViewVisible = false;
            this._bEditSaved = false;
            this._bSavingScheda = false;
            this._iEditRouteRequest = 0;
            this._bEditDestroyed = false;
            this._oNavigationDelegate = {
                onBeforeHide: this._onEditBeforeHide
            };
            this.getView().addEventDelegate(this._oNavigationDelegate, this);
            this.getOwnerComponent().getRouter().getRoute("RouteEdit").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this._loadSchemeForEdit();
        },
        _loadSchemeForEdit: function () {
            this._bEditViewVisible = true;
            this._iEditRouteRequest += 1;
            var iRouteRequest = this._iEditRouteRequest;
            var oEditModel = this.getView().getModel("edit");
            oEditModel.setProperty("/scheda", this._createEmptySchedaData());
            oEditModel.setProperty("/helpScheda", []);
            oEditModel.setProperty("/risultatiOA", []);
            this._applyTableRowLimit("edit", "/risultatiOA", "tableOA");
            oEditModel.setProperty("/posizioniSelezionate", []);
            this._applyTableRowLimit("edit", "/posizioniSelezionate", "tableOASelected");
            oEditModel.setProperty("/filters", {
                uEco: "",
                terr: "",
                edif: ""
            });
            this.getView().getModel("helpUEco").setData([]);
            this.getView().getModel("helpTerr").setData([]);
            this.getView().getModel("helpEdif").setData([]);
            this.getView().getModel("editSelection").setData({
                idScheda: "",
                text: ""
            });
            if (this.byId("tableOA")) {
                this.byId("tableOA").clearSelection();
            }
            if (this.byId("tableOASelected")) {
                this.byId("tableOASelected").clearSelection();
            }
            this._bEditSaved = false;
            this._resetEditValidation();
            this._loadViewFragment("SelectSchedaEdit").then(function (oDialog) {
                if (!this._bEditViewVisible || this._iEditRouteRequest !== iRouteRequest) {
                    return;
                }
                this.byId("inputSelectSchedaEdit").setValue("");
                oDialog.setBusy(false);
                oDialog.open();
            }.bind(this)).catch(function (oError) {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile aprire la selezione della Scheda Ricognizione.", {
                        details: oError && oError.message ? oError.message : String(oError)
                    });
                }
            }.bind(this));
        },
        _loadEditHelp: function () {
            var oEditModel = this.getView().getModel("edit");
            var iRouteRequest = this._iEditRouteRequest;
            return this._readHelpScheda().then(function (aResults) {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    oEditModel.setSizeLimit(Math.max(
                        100,
                        aResults.length,
                        (oEditModel.getProperty("/risultatiOA") || []).length,
                        (oEditModel.getProperty("/posizioniSelezionate") || []).length
                    ));
                    oEditModel.setProperty("/helpScheda", aResults);
                }
                return aResults;
            }.bind(this));
        },
        _mapSchedaDetailToEditModel: function (oData) {
            return this._mapSchedaDetailToFormModel(oData, {
                preserveId: true,
                preserveState: true,
                preserveModelId: true,
                preserveDate: true
            });
        },
        _mapLoadedPositions: function (aPositions, sIdScheda) {
            return this._mapSchedaPositions(aPositions, sIdScheda);
        },
        _getDefaultSocieta: function () {
            return "1000";
        },
        _resetEditValidation: function () {
            BaseController.prototype._resetSchedaValidation.call(this, "panelTestata", ["inputSupCop", "inputSupScop"]);
        },
        _validateEditBeforeSave: function () {
            return BaseController.prototype._validateSchedaBeforeSave.call(this, {
                panelId: "panelTestata",
                positionsModelName: "edit",
                positionsPath: "/posizioniSelezionate",
                panelOAId: "panelOA",
                surfaceFieldIds: ["inputSupCop", "inputSupScop"]
            });
        },
        onNavBack: function () {
            this.onCancel();
        },
        onCancel: function () {
            if (this._bSavingScheda) {
                return;
            }
            MessageBox.confirm("Sei sicuro di voler annullare? Le modifiche non salvate andranno perse.", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._navToMain();
                    }
                }.bind(this)
            });
        },
        onSchedaValueHelpEdit: function () {
            var iRouteRequest = this._iEditRouteRequest;
            this._loadViewFragment("HelpSchedaEdit").then(function (oDialog) {
                if (!this._bEditViewVisible || this._iEditRouteRequest !== iRouteRequest) {
                    return;
                }
                if (oDialog.getBusy()) {
                    return;
                }
                oDialog.getBinding("items").filter([]);
                this.getView().getModel("edit").setProperty("/helpScheda", []);
                oDialog.setBusyIndicatorDelay(0);
                oDialog.setBusy(true);
                this._loadEditHelp().catch(function (oError) {
                    if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                        MessageBox.error("Impossibile caricare le Schede Ricognizione.", {
                            details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                        });
                    }
                }.bind(this)).finally(function () {
                    if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                        oDialog.setBusy(false);
                    }
                }.bind(this));
                oDialog.open("");
            }.bind(this)).catch(function (oError) {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile aprire il ValueHelp della Scheda Ricognizione.", {
                        details: oError && oError.message ? oError.message : String(oError)
                    });
                }
            }.bind(this));
        },
        onSearchHelpSchedaEdit: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("idScheda", FilterOperator.Contains, sValue),
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
        onConfirmHelpSchedaEdit: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("edit").getObject();
            if (!oSelectedObject.idScheda) {
                MessageBox.error("La scheda selezionata non contiene un ID valido.");
                return;
            }
            var sText = oSelectedObject.idScheda;
            if (oSelectedObject.denBene) {
                sText += " - " + oSelectedObject.denBene;
            }
            this.getView().getModel("editSelection").setData({
                idScheda: oSelectedObject.idScheda,
                text: sText
            });
            this.byId("inputSelectSchedaEdit").setValue(sText);
        },
        onLoadSelectedSchedaForEdit: function () {
            var sIdScheda = this.getView().getModel("editSelection").getProperty("/idScheda");
            var oDialog = this.byId("dialogSelectSchedaEdit");
            var iRouteRequest = this._iEditRouteRequest;
            if (oDialog.getBusy()) {
                return;
            }
            if (!sIdScheda) {
                MessageBox.error("Selezionare una Scheda Ricognizione.");
                return;
            }
            oDialog.setBusyIndicatorDelay(0);
            oDialog.setBusy(true);
            this._readSchedaDetail(sIdScheda).then(function (oDetail) {
                if (!this._bEditViewVisible || this._iEditRouteRequest !== iRouteRequest) {
                    return;
                }
                var aSourcePositions = oDetail.toPosizioni && oDetail.toPosizioni.results;
                if (!Array.isArray(aSourcePositions)) {
                    throw new Error("La risposta non contiene la raccolta toPosizioni espansa.");
                }
                var oScheda = this._mapSchedaDetailToEditModel(oDetail);
                var aPositions = this._mapLoadedPositions(aSourcePositions, oScheda.idScheda);
                var oEditModel = this.getView().getModel("edit");
                oEditModel.setSizeLimit(Math.max(100, aPositions.length, (oEditModel.getProperty("/helpScheda") || []).length));
                oEditModel.setProperty("/scheda", oScheda);
                oEditModel.setProperty("/posizioniSelezionate", aPositions);
                this._applyTableRowLimit("edit", "/posizioniSelezionate", "tableOASelected");
                this._resetEditValidation();
                var oPositionsTable = this.byId("tableOASelected");
                if (oPositionsTable) {
                    oPositionsTable.clearSelection();
                }
                oDialog.close();
            }.bind(this)).catch(function (oError) {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile caricare la Scheda Ricognizione.", {
                        details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    oDialog.setBusy(false);
                }
            }.bind(this));
        },
        onCancelSelectSchedaEdit: function () {
            var oDialog = this.byId("dialogSelectSchedaEdit");
            if (oDialog) {
                oDialog.close();
            }
        },
        onAfterCloseSelectSchedaEdit: function () {
            var sIdScheda = this.getView().getModel("editSelection").getProperty("/idScheda");
            var aPositions = this.getView().getModel("edit").getProperty("/posizioniSelezionate") || [];
            if (this._bEditViewVisible && !sIdScheda && aPositions.length === 0) {
                this._navToMain();
            }
        },
        _onEditBeforeHide: function () {
            this._bEditViewVisible = false;
            ["dialogSelectSchedaEdit", "dialogHelpSchedaEdit", "dialogHelpUEco", "dialogHelpTerr", "dialogHelpEdif"].forEach(function (sId) {
                var oControl = this.byId(sId);
                if (oControl && typeof oControl.close === "function" && oControl.isOpen && oControl.isOpen()) {
                    oControl.close();
                }
            }, this);
        },
        onSearchOA: function () {
            var aFilters = [
                new Filter("soc", FilterOperator.EQ, this._getDefaultSocieta())
            ];
            var sUEco = (this.getView().getModel("edit").getProperty("/filters/uEco") || "").trim();
            var sTerr = (this.getView().getModel("edit").getProperty("/filters/terr") || "").trim();
            var sEdif = (this.getView().getModel("edit").getProperty("/filters/edif") || "").trim();
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
                    this.getView().getModel("edit").setProperty("/risultatiOA", aResults);
                    this._applyTableRowLimit("edit", "/risultatiOA", "tableOA");
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
        onValueHelpUEcoRequest: function () {
            this._loadHelpValues("/helpUEco", [], "helpUEco").then(function () {
                return this._loadViewFragment("HelpUEco");
            }.bind(this)).then(function (oDialog) {
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }).catch(function () {
                MessageBox.error("Impossibile caricare l'help Unità Economica.");
            });
        },
        onValueHelpTerrRequest: function () {
            var sUEco = this.getView().getModel("edit").getProperty("/filters/uEco");
            if (!sUEco) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgSelectUEcoFirst"));
                return;
            }
            this._loadHelpValues("/helpTerr", [new Filter("uEco", FilterOperator.EQ, sUEco)], "helpTerr").then(function () {
                return this._loadViewFragment("HelpTerr");
            }.bind(this)).then(function (oDialog) {
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }).catch(function () {
                MessageBox.error("Impossibile caricare l'help Terreno.");
            });
        },
        onValueHelpEdifRequest: function () {
            var sUEco = this.getView().getModel("edit").getProperty("/filters/uEco");
            var sTerr = this.getView().getModel("edit").getProperty("/filters/terr");
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
                return this._loadViewFragment("HelpEdif");
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
            var oEditModel = this.getView().getModel("edit");
            oEditModel.setProperty("/filters/uEco", oSelectedObject.uEco || "");
            oEditModel.setProperty("/filters/terr", "");
            oEditModel.setProperty("/filters/edif", "");
        },
        onConfirmHelpTerr: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("helpTerr").getObject();
            var oEditModel = this.getView().getModel("edit");
            oEditModel.setProperty("/filters/terr", oSelectedObject.terr || "");
            oEditModel.setProperty("/filters/edif", "");
        },
        onConfirmHelpEdif: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oSelectedObject = oSelectedItem.getBindingContext("helpEdif").getObject();
            this.getView().getModel("edit").setProperty("/filters/edif", oSelectedObject.edif || "");
        },
        onRequiredTestataChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = (oInput.getValue() || "").trim();
            if (sValue !== "") {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }
            if (oInput.getId().indexOf("inputSupCop") !== -1 || oInput.getId().indexOf("inputSupScop") !== -1) {
                this._validateAlternativeSurfaceFields("inputSupCop", "inputSupScop");
            }
        },
        onAddSelectedPositions: function () {
            var oTable = this.byId("tableOA");
            var oPositionsTable = this.byId("tableOASelected");
            if (oTable.getBusy() || this._bSavingScheda || this._bEditSaved) {
                return;
            }
            var aSelectedIndices = oTable.getSelectedIndices();
            if (aSelectedIndices.length === 0) {
                MessageToast.show("Selezionare almeno un Oggetto Architettonico da aggiungere.");
                return;
            }
            var oEditModel = this.getView().getModel("edit");
            var aCurrentPositions = oEditModel.getProperty("/posizioniSelezionate") || [];
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
            var sIdScheda = oEditModel.getProperty("/scheda/idScheda");
            var iRouteRequest = this._iEditRouteRequest;
            oTable.setBusyIndicatorDelay(0);
            oTable.setBusy(true);
            oPositionsTable.setBusyIndicatorDelay(0);
            oPositionsTable.setBusy(true);
            return Promise.all(aMissingObjects.map(function (oOA) {
                return this._readPosizioneDetail(oOA, sIdScheda);
            }, this)).then(function (aDetails) {
                if (!this._bEditViewVisible || this._iEditRouteRequest !== iRouteRequest) {
                    return;
                }
                var aPositions = this._mapLoadedPositions(aDetails, sIdScheda);
                var iAdded = BaseController.prototype._mergeSelectedPositions.call(this, "edit", "/posizioniSelezionate", "tableOASelected", aPositions);
                var aResults = oEditModel.getProperty("/risultatiOA") || [];
                var aHelpScheda = oEditModel.getProperty("/helpScheda") || [];
                var aSelectedPositions = oEditModel.getProperty("/posizioniSelezionate") || [];
                oEditModel.setSizeLimit(Math.max(100, aSelectedPositions.length, aResults.length, aHelpScheda.length));
                oTable.clearSelection();
                MessageToast.show("Posizioni aggiunte: " + iAdded + ".");
            }.bind(this)).catch(function (oError) {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    MessageBox.error("Impossibile completare l'aggiunta delle Posizioni. Nessuna nuova posizione è stata aggiunta.", {
                        details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    oTable.setBusy(false);
                    oPositionsTable.setBusy(false);
                }
            }.bind(this));
        },
        onRemoveSelectedPositions: function () {
            var bRemoved = BaseController.prototype._removeSelectedPositions.call(this, "edit", "/posizioniSelezionate", "tableOASelected");
            if (!bRemoved) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgNoOAToRemove"));
            }
        },
        onSaveDraft: function () {
            this._saveEditedScheda("B");
        },
        onSaveFinal: function () {
            this._saveEditedScheda("D");
        },
        _buildEditPayload: function (sStato) {
            var oEditModel = this.getView().getModel("edit");
            var oScheda = Object.assign({}, oEditModel.getProperty("/scheda"));
            oScheda.dtModif = this._getCurrentDate();
            return this._buildSchedaPayload(
                oScheda,
                oEditModel.getProperty("/posizioniSelezionate") || [],
                sStato,
                Object.keys(this._createEmptySchedaData())
            );
        },
        _saveEditedScheda: function (sStato) {
            if (this._bSavingScheda || this._bEditSaved) {
                return;
            }
            if (!this._validateEditBeforeSave()) {
                return;
            }
            var oPayload;
            try {
                oPayload = this._buildEditPayload(sStato);
            } catch (oError) {
                MessageBox.warning(oError.message);
                return;
            }
            this._bSavingScheda = true;
            var oView = this.getView();
            var iRouteRequest = this._iEditRouteRequest;
            oView.setBusy(true);
            this._postScheda(oPayload).then(function (oData) {
                if (!this._bEditViewVisible || this._iEditRouteRequest !== iRouteRequest) {
                    return;
                }
                this._bEditSaved = true;
                var sMessage = sStato === "B"
                    ? "Scheda salvata in stato Provvisorio."
                    : "Scheda rilasciata in stato Definitivo.";
                if (oData && oData.idScheda) {
                    sMessage += "\nNumero scheda: " + oData.idScheda;
                }
                MessageBox.success(sMessage, {
                    onClose: function () {
                        if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                            this._navToMain();
                        }
                    }.bind(this)
                });
            }.bind(this)).catch(function (oError) {
                if (this._bEditViewVisible && this._iEditRouteRequest === iRouteRequest) {
                    MessageBox.error("Salvataggio della Scheda Ricognizione non riuscito.", {
                        details: oError && (oError.responseText || oError.message) ? oError.responseText || oError.message : String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                this._bSavingScheda = false;
                oView.setBusy(false);
            }.bind(this));
        },
        onExit: function () {
            this._bEditDestroyed = true;
            this._bEditViewVisible = false;
            this.getOwnerComponent().getRouter().getRoute("RouteEdit").detachPatternMatched(this._onRouteMatched, this);
            this.getView().removeEventDelegate(this._oNavigationDelegate);
            ["edit", "editSelection", "helpUEco", "helpTerr", "helpEdif"].forEach(function (sModelName) {
                var oModel = this.getView().getModel(sModelName);
                if (oModel) {
                    oModel.destroy();
                }
            }, this);
        }
    });
});