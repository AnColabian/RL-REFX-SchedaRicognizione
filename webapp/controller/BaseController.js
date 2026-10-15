sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "schedaricognizione/model/formatter"
], (Controller, MessageBox, formatter) => {
    "use strict";
    return Controller.extend("schedaricognizione.controller.BaseController", {
        formatter: formatter,
        _navToMain: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
        },
        _readOData: function (sPath, mParameters) {
            var oModel = this.getOwnerComponent().getModel();
            return new Promise(function (resolve, reject) {
                if (!oModel || typeof oModel.read !== "function") {
                    reject(new Error("Modello OData V2 non disponibile."));
                    return;
                }
                try {
                    oModel.read(sPath, Object.assign({}, mParameters || {}, {
                        success: function (oData) {
                            resolve(oData);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    }));
                } catch (oError) {
                    reject(oError);
                }
            });
        },
        _readEntityByKey: function (sEntitySet, oKeys, mParameters) {
            var oModel = this.getOwnerComponent().getModel();
            try {
                if (!oModel || typeof oModel.createKey !== "function") {
                    throw new Error("Modello OData V2 non disponibile.");
                }
                if (!oModel.getServiceMetadata()) {
                    throw new Error("Metadata OData non disponibile. Ricaricare l'applicazione.");
                }
                var sPath = "/" + oModel.createKey(sEntitySet, oKeys);
                return this._readOData(sPath, mParameters);
            } catch (oError) {
                return Promise.reject(oError);
            }
        },
        _readHelpScheda: function () {
            return this._readOData("/helpScheda").then(function (oData) {
                return oData && Array.isArray(oData.results) ? oData.results : [];
            });
        },
        _readSchedaDetail: function (sIdScheda) {
            if (!sIdScheda || !String(sIdScheda).trim()) {
                return Promise.reject(new Error("ID Scheda non valorizzato."));
            }
            var sId = String(sIdScheda).trim();
            return this._readEntityByKey("scheda", {
                idScheda: sId
            }, {
                urlParameters: {
                    "$expand": "toPosizioni"
                }
            }).then(function (oData) {
                if (!oData || String(oData.idScheda) !== sId) {
                    throw new Error("Il servizio non ha restituito il dettaglio della scheda richiesta.");
                }
                return oData;
            });
        },
        _readPosizioneDetail: function (oOA, sIdScheda) {
            var sIdOA = oOA && oOA.idOggArch !== null && oOA.idOggArch !== undefined
                ? String(oOA.idOggArch).trim()
                : "";
            var sId = sIdScheda === undefined ? "99999999" : String(sIdScheda || "").trim();
            if (!sIdOA) {
                return Promise.reject(new Error("ID Oggetto Architettonico non valorizzato."));
            }
            if (!sId) {
                return Promise.reject(new Error("ID Scheda non valorizzato."));
            }
            return this._readEntityByKey("posizioni", {
                idScheda: sId,
                idOggArch: sIdOA
            });
        },
        _loadViewFragment: function (sFragmentName) {
            if (!this._mViewFragments) {
                this._mViewFragments = {};
            }
            if (!this._mViewFragments[sFragmentName]) {
                this._mViewFragments[sFragmentName] = this.loadFragment({
                    name: "schedaricognizione.view.fragment." + sFragmentName
                }).catch(function (oError) {
                    delete this._mViewFragments[sFragmentName];
                    throw oError;
                }.bind(this));
            }
            return this._mViewFragments[sFragmentName];
        },
        _getCurrentDate: function () {
            var oDate = new Date();
            var iYear = oDate.getFullYear();
            var sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
            var sDay = ("0" + oDate.getDate()).slice(-2);
            return iYear + sMonth + sDay;
        },
        _getCurrentTime: function () {
            var oDate = new Date();
            var sHours = ("0" + oDate.getHours()).slice(-2);
            var sMinutes = ("0" + oDate.getMinutes()).slice(-2);
            var sSeconds = ("0" + oDate.getSeconds()).slice(-2);
            return sHours + sMinutes + sSeconds;
        },
        _mapSchedaPositions: function (aPositions, sIdScheda) {
            var sId = sIdScheda === null || sIdScheda === undefined ? "" : String(sIdScheda).trim();
            if (!sId) {
                throw new Error("ID Scheda di destinazione non valorizzato.");
            }
            return aPositions.map(function (oItem) {
                var oPosition = {
                    idScheda: sId
                };
                [
                    "chIntOA",
                    "idOggArch",
                    "objnrOA",
                    "objnrUL",
                    "chIntUL",
                    "soc",
                    "uEco",
                    "terr",
                    "edif",
                    "unitLocaz",
                    "numIndir",
                    "tpCatas",
                    "tpEdTer",
                    "codBelf",
                    "foglio",
                    "sezUrb",
                    "partic",
                    "sub",
                    "denom",
                    "tpPart",
                    "codComCat"
                ].forEach(function (sProperty) {
                    var vValue = oItem[sProperty];
                    oPosition[sProperty] = vValue === null || vValue === undefined ? "" : vValue;
                });
                return oPosition;
            });
        },
        _buildSchedaPayload: function (oSource, aPositions, sStato, aHeaderProperties) {
            if (!oSource) {
                throw new Error("Dati della Scheda Ricognizione non disponibili.");
            }
            if (sStato !== "B" && sStato !== "D") {
                throw new Error("Stato di salvataggio non valido.");
            }
            var sIdScheda = oSource.idScheda === null || oSource.idScheda === undefined
                ? ""
                : String(oSource.idScheda).trim();
            if (!sIdScheda) {
                throw new Error("ID Scheda non valorizzato.");
            }
            var oHeader = {};
            aHeaderProperties.forEach(function (sProperty) {
                var vValue = oSource[sProperty];
                oHeader[sProperty] = vValue === null || vValue === undefined ? "" : vValue;
            });
            oHeader.idScheda = sIdScheda;
            oHeader.stato = sStato;
            if (oHeader.dtCompil instanceof Date) {
                oHeader.dtCompil = new Date(oHeader.dtCompil.getTime());
            } else {
                var aDateParts = /^(\d{4})(\d{2})(\d{2})$/.exec(String(oHeader.dtCompil));
                if (!aDateParts) {
                    throw new Error("Data compilazione non valida.");
                }
                var iYear = Number(aDateParts[1]);
                var iMonth = Number(aDateParts[2]) - 1;
                var iDay = Number(aDateParts[3]);
                oHeader.dtCompil = new Date(Date.UTC(iYear, iMonth, iDay));
                if (oHeader.dtCompil.getUTCFullYear() !== iYear ||
                    oHeader.dtCompil.getUTCMonth() !== iMonth ||
                    oHeader.dtCompil.getUTCDate() !== iDay) {
                    throw new Error("Data compilazione non valida.");
                }
            }
            if (isNaN(oHeader.dtCompil.getTime())) {
                throw new Error("Data compilazione non valida.");
            }
            if (!Array.isArray(aPositions) || aPositions.length === 0) {
                throw new Error("Inserire almeno un Oggetto Architettonico nelle Posizioni correnti.");
            }
            if (aPositions.some(function (oPosition) {
                return !oPosition ||
                    oPosition.idOggArch === null ||
                    oPosition.idOggArch === undefined ||
                    String(oPosition.idOggArch).trim() === "";
            })) {
                throw new Error("La tabella Posizioni contiene una riga priva di ID Oggetto Architettonico.");
            }
            return {
                header: oHeader,
                positions: this._mapSchedaPositions(aPositions, sIdScheda)
            };
        },
        _postScheda: function (oPayload) {
            var oModel = this.getOwnerComponent().getModel();
            var sGroupId = "saveScheda";
            return new Promise(function (resolve, reject) {
                var oRootContext;
                function cleanup() {
                    if (oRootContext && oRootContext.isTransient()) {
                        oModel.deleteCreatedEntry(oRootContext);
                    }
                }
                try {
                    if (!oModel || !oModel.getServiceMetadata()) {
                        throw new Error("Metadata OData non disponibile.");
                    }
                    if (!oPayload || !oPayload.header || !Array.isArray(oPayload.positions)) {
                        throw new Error("Payload di salvataggio non valido.");
                    }
                    if (oPayload.positions.some(function (oPosition) {
                        return oPosition.idScheda !== oPayload.header.idScheda;
                    })) {
                        throw new Error("L'ID Scheda delle Posizioni non corrisponde alla Testata.");
                    }
                    var aGroups = oModel.getDeferredGroups();
                    if (aGroups.indexOf(sGroupId) === -1) {
                        oModel.setDeferredGroups(aGroups.concat([sGroupId]));
                    }
                    oRootContext = oModel.createEntry("/scheda", {
                        groupId: sGroupId,
                        refreshAfterChange: false,
                        properties: oPayload.header,
                        success: function (oData) {
                            resolve(oData);
                        },
                        error: function (oError) {
                            cleanup();
                            reject(oError);
                        }
                    });
                    oRootContext.created().catch(function () { });
                    oPayload.positions.forEach(function (oPosition) {
                        oModel.createEntry("toPosizioni", {
                            context: oRootContext,
                            properties: oPosition
                        });
                    });
                    oModel.submitChanges({
                        groupId: sGroupId,
                        error: function (oError) {
                            cleanup();
                            reject(oError);
                        }
                    });
                } catch (oError) {
                    cleanup();
                    reject(oError);
                }
            });
        },
        _createEmptySchedaData: function () {
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
        _mapSchedaDetailToFormModel: function (oData, mOptions) {
            var oScheda = this._createEmptySchedaData();
            var bPreserveId = !!(mOptions && mOptions.preserveId);
            var bPreserveState = !!(mOptions && mOptions.preserveState);
            var bPreserveModelId = !!(mOptions && mOptions.preserveModelId);
            var bPreserveDate = !!(mOptions && mOptions.preserveDate);
            Object.keys(oScheda).forEach(function (sProperty) {
                if (Object.prototype.hasOwnProperty.call(oData, sProperty) && oData[sProperty] !== null && oData[sProperty] !== undefined) {
                    oScheda[sProperty] = oData[sProperty];
                }
            });
            if (!bPreserveId) {
                oScheda.idScheda = "99999999";
            }
            if (!bPreserveState) {
                oScheda.stato = "";
            }
            if (!bPreserveModelId) {
                oScheda.idSchModel = oData.idScheda || "";
            }
            if (!bPreserveDate) {
                oScheda.dtCompil = this._getCurrentDate();
            }
            ["supLU", "supFond", "supCop", "supScop", "stimaVal"].forEach(function (sProperty) {
                oScheda[sProperty] = this.formatter.normalizeDecimalValue(oScheda[sProperty]);
            }, this);
            ["numEdif", "numLivFuo", "numLivEnt", "annoValor"].forEach(function (sProperty) {
                oScheda[sProperty] = this.formatter.normalizeIntegerLikeValue(oScheda[sProperty]);
            }, this);
            return oScheda;
        },
        _getRequiredTestataFields: function (sPanelId) {
            var aControls = this.byId(sPanelId).findAggregatedObjects(true);
            var aLabels = aControls.filter(function (oControl) {
                return oControl.isA("sap.m.Label");
            });
            return aControls.filter(function (oControl) {
                return oControl.isA("sap.m.Input") && oControl.getRequired();
            }).map(function (oInput) {
                var oLabel = aLabels.find(function (oCandidate) {
                    return oCandidate.getLabelFor() === oInput.getId();
                });
                return {
                    input: oInput,
                    label: oLabel ? oLabel.getText() : oInput.getId()
                };
            });
        },
        _resetSchedaValidation: function (sPanelId, aAlternativeFieldIds) {
            this._getRequiredTestataFields(sPanelId).forEach(function (oField) {
                oField.input.setValueState("None");
                oField.input.setValueStateText("");
            });
            (aAlternativeFieldIds || []).forEach(function (sId) {
                var oInput = this.byId(sId);
                if (oInput) {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                }
            }, this);
        },
        _validateAlternativeSurfaceFields: function (sSupCopId, sSupScopId) {
            var oSupCop = this.byId(sSupCopId);
            var oSupScop = this.byId(sSupScopId);
            var fSupCop = this.formatter.parseNumericValue(oSupCop ? oSupCop.getValue() : "");
            var fSupScop = this.formatter.parseNumericValue(oSupScop ? oSupScop.getValue() : "");
            var bValid = fSupCop > 0 || fSupScop > 0;
            if (!bValid) {
                if (oSupCop) {
                    oSupCop.setValueState("Error");
                    oSupCop.setValueStateText("Compilare Superficie Coperta o Superficie Scoperta con un valore maggiore di 0.");
                }
                if (oSupScop) {
                    oSupScop.setValueState("Error");
                    oSupScop.setValueStateText("Compilare Superficie Coperta o Superficie Scoperta con un valore maggiore di 0.");
                }
                return false;
            }
            if (oSupCop) {
                oSupCop.setValueState("None");
                oSupCop.setValueStateText("");
            }
            if (oSupScop) {
                oSupScop.setValueState("None");
                oSupScop.setValueStateText("");
            }
            return true;
        },
        _validateSchedaBeforeSave: function (mOptions) {
            var aMissing = [];
            var sPanelId = mOptions.panelId;
            var sPositionsModelName = mOptions.positionsModelName;
            var sPositionsPath = mOptions.positionsPath;
            var sPanelOAId = mOptions.panelOAId;
            var aSurfaceFieldIds = mOptions.surfaceFieldIds || [];
            this._getRequiredTestataFields(sPanelId).forEach(function (oField) {
                var bMissing = oField.input.getValue().trim() === "";
                oField.input.setValueState(bMissing ? "Error" : "None");
                oField.input.setValueStateText(bMissing ? "Compilare " + oField.label : "");
                if (bMissing) {
                    aMissing.push(oField.label);
                }
            });
            if (!this._validateAlternativeSurfaceFields(aSurfaceFieldIds[0], aSurfaceFieldIds[1])) {
                aMissing.push("Superficie Coperta o Superficie Scoperta con valore maggiore di 0");
            }
            var aPositions = this.getView().getModel(sPositionsModelName).getProperty(sPositionsPath) || [];
            var bHasOA = aPositions.some(function (oPosition) {
                return oPosition && String(oPosition.idOggArch || "").trim() !== "";
            });
            if (!bHasOA) {
                aMissing.push("Inserire almeno un Oggetto Architettonico nella tabella Posizioni correnti");
            }
            if (aMissing.length > 0) {
                this.byId(sPanelId).setExpanded(true);
                if (!bHasOA && sPanelOAId) {
                    this.byId(sPanelOAId).setExpanded(true);
                }
                MessageBox.warning("Completare i seguenti dati prima del salvataggio:\n\n• " + aMissing.join("\n• "));
                return false;
            }
            return true;
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
        _mergeSelectedPositions: function (sModelName, sPath, sTableId, aPositionsToAdd) {
            var oModel = this.getView().getModel(sModelName);
            var aCurrentPositions = oModel.getProperty(sPath) || [];
            var aMergedPositions = aCurrentPositions.slice();
            var oKnownIds = new Set(aCurrentPositions.map(function (oPosition) {
                return String(oPosition.idOggArch || "").trim();
            }));
            var iAdded = 0;
            aPositionsToAdd.forEach(function (oPosition) {
                var sIdOA = String(oPosition.idOggArch || "").trim();
                if (sIdOA && !oKnownIds.has(sIdOA)) {
                    oKnownIds.add(sIdOA);
                    aMergedPositions.push(oPosition);
                    iAdded += 1;
                }
            });
            oModel.setProperty(sPath, aMergedPositions);
            this._applyTableRowLimit(sModelName, sPath, sTableId);
            return iAdded;
        },
        _removeSelectedPositions: function (sModelName, sPath, sTableId) {
            var oTable = this.byId(sTableId);
            var aSelectedIndices = oTable.getSelectedIndices();
            if (!aSelectedIndices || aSelectedIndices.length === 0) {
                return false;
            }
            var aCurrentPositions = this.getView().getModel(sModelName).getProperty(sPath) || [];
            var aKeysToRemove = aSelectedIndices.map(function (iIndex) {
                var oObject = oTable.getContextByIndex(iIndex).getObject();
                return oObject.idOggArch + "|" + oObject.soc + "|" + oObject.uEco + "|" + oObject.terr + "|" + oObject.edif;
            });
            var aRemainingPositions = aCurrentPositions.filter(function (oItem) {
                var sKey = oItem.idOggArch + "|" + oItem.soc + "|" + oItem.uEco + "|" + oItem.terr + "|" + oItem.edif;
                return aKeysToRemove.indexOf(sKey) === -1;
            });
            this.getView().getModel(sModelName).setProperty(sPath, aRemainingPositions);
            this._applyTableRowLimit(sModelName, sPath, sTableId);
            oTable.clearSelection();
            return true;
        }
    });
});