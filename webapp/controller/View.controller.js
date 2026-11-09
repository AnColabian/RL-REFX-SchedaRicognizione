sap.ui.define([
    "schedaricognizione/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet"
], (BaseController, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, Spreadsheet) => {
    "use strict";
    return BaseController.extend("schedaricognizione.controller.View", {
        onInit: function () {
            var oDisplayModel = new JSONModel({
                scheda: {},
                posizioni: [],
                helpScheda: [],
                positionRowCount: 1,
                loaded: false
            });
            oDisplayModel.setDefaultBindingMode("OneWay");
            this.getView().setModel(oDisplayModel, "display");
            this.getView().setModel(new JSONModel({
                idScheda: "",
                text: ""
            }), "schedaSelection");
            this._iViewRequest = 0;
            this._bViewActive = false;
            this._bViewDestroyed = false;
            this._oViewNavigationDelegate = {
                onBeforeHide: this._onViewBeforeHide
            };
            this.getView().addEventDelegate(this._oViewNavigationDelegate, this);
            this.getOwnerComponent().getRouter().getRoute("RouteView").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this._bViewActive = true;
            this._iViewRequest += 1;
            var iRequest = this._iViewRequest;
            this.getView().getModel("display").setData({
                scheda: {},
                posizioni: [],
                helpScheda: [],
                positionRowCount: 1,
                loaded: false
            });
            this.getView().getModel("schedaSelection").setData({
                idScheda: "",
                text: ""
            });
            this._initDomainFields("panelTestata", "display", true);
            this._loadViewFragment("SelectScheda").then(function (oDialog) {
                if (!this._isViewRequestCurrent(iRequest)) {
                    return;
                }
                oDialog.setBusy(false);
                oDialog.open();
            }.bind(this)).catch(function (oError) {
                if (this._isViewRequestCurrent(iRequest)) {
                    MessageBox.error("Impossibile aprire la selezione della Scheda Ricognizione.", {
                        details: oError.message || String(oError)
                    });
                }
            }.bind(this));
        },
        _isViewRequestCurrent: function (iRequest) {
            return !this._bViewDestroyed && this._bViewActive && this._iViewRequest === iRequest;
        },
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
            }
        },
        onExportPDF: function () {
            MessageToast.show("Esportazione PDF - Funzionalità da implementare");
        },
        onExportExcel: function () {
            if (this._bExportingExcel) {
                return;
            }
            var oView = this.getView();
            var oModel = oView.getModel("display");
            if (!oModel.getProperty("/loaded")) {
                MessageBox.warning("Selezionare e caricare una Scheda Ricognizione prima di esportare.");
                return;
            }
            var oSpreadsheet;
            this._bExportingExcel = true;
            oView.setBusy(true);
            return Promise.resolve().then(function () {
                var aPositions = oModel.getProperty("/posizioni");
                if (!Array.isArray(aPositions)) {
                    throw new Error("Le Posizioni della scheda non sono disponibili.");
                }
                var aColumns = this.byId("tableViewPositions").getColumns().map(function (oColumn, iIndex) {
                    var oInfo = oColumn.getTemplate().getBindingInfo("text");
                    var oPart = oInfo && (oInfo.parts ? oInfo.parts[0] : oInfo);
                    if (!oPart || oPart.model !== "display" || !oPart.path) {
                        throw new Error("Configurazione di esportazione non valida per una colonna delle Posizioni.");
                    }
                    return {
                        label: oColumn.getLabel().getText(),
                        property: "column" + iIndex,
                        type: "String",
                        width: 22,
                        sourcePath: oPart.path,
                        formatter: oInfo.formatter
                    };
                });
                var aRows = aPositions.map(function (oPosition) {
                    var oRow = {};
                    aColumns.forEach(function (oColumn) {
                        var vValue = oPosition[oColumn.sourcePath];
                        var vFormatted = oColumn.formatter ? oColumn.formatter.call(this, vValue) : vValue;
                        oRow[oColumn.property] = vFormatted === null || vFormatted === undefined ? "" : String(vFormatted);
                    }, this);
                    return oRow;
                }, this);
                var aHeaderGroups = this._getExcelHeaderGroups();
                if (!aColumns.length || !aHeaderGroups.length) {
                    throw new Error("Non sono disponibili i campi da esportare.");
                }
                var sIdScheda = String(oModel.getProperty("/scheda/idScheda") || "").replace(/[^a-zA-Z0-9_-]/g, "_");
                oSpreadsheet = new Spreadsheet({
                    fileName: "Scheda_Ricognizione_" + sIdScheda + ".xlsx",
                    workbook: {
                        columns: aColumns.map(function (oColumn) {
                            return {
                                label: oColumn.label,
                                property: oColumn.property,
                                type: oColumn.type,
                                width: oColumn.width
                            };
                        }),
                        context: {
                            application: "Scheda Ricognizione",
                            title: "Scheda Ricognizione " + sIdScheda,
                            sheetName: "Posizioni",
                            metaSheetName: "Testata",
                            metainfo: aHeaderGroups
                        }
                    },
                    dataSource: aRows
                });
                return oSpreadsheet.build();
            }.bind(this)).catch(function (oError) {
                MessageBox.error("Impossibile esportare la Scheda Ricognizione in Excel.", {
                    details: oError && oError.message ? oError.message : String(oError)
                });
            }).finally(function () {
                if (oSpreadsheet) {
                    oSpreadsheet.destroy();
                }
                this._bExportingExcel = false;
                if (!oView.isDestroyed()) {
                    oView.setBusy(false);
                }
            }.bind(this));
        },
        _getExcelHeaderGroups: function () {
            return ["panelIdenti", "panelTestata"].map(function (sPanelId) {
                var oPanel = this.byId(sPanelId);
                var aItems = [];
                var sLabel = "";
                oPanel.findAggregatedObjects(true).forEach(function (oControl) {
                    if (oControl.isA("sap.m.Label")) {
                        sLabel = oControl.getText();
                        return;
                    }
                    if (!oControl.isA("sap.m.Text")) {
                        return;
                    }
                    var oField = this._getSchedaPropertyFromBinding(oControl, "text", "display");
                    if (oField && sLabel) {
                        aItems.push({
                            key: sLabel,
                            value: oControl.getText()
                        });
                        sLabel = "";
                    }
                }, this);
                return {
                    name: oPanel.getHeaderText(),
                    items: aItems
                };
            }, this).filter(function (oGroup) {
                return oGroup.items.length > 0;
            });
        },
        onSchedaValueHelp: function () {
            var iRequest = this._iViewRequest;
            if (this._bViewHelpLoading) {
                return;
            }
            this._bViewHelpLoading = true;
            var oSelectionDialog = this.byId("dialogSelectScheda");
            oSelectionDialog.setBusyIndicatorDelay(0);
            oSelectionDialog.setBusy(true);
            Promise.all([
                this._loadViewFragment("HelpScheda"),
                this._readHelpScheda()
            ]).then(function (aResults) {
                if (!this._isViewRequestCurrent(iRequest)) {
                    return;
                }
                var oDialog = aResults[0];
                var aSchede = aResults[1];
                var oModel = this.getView().getModel("display");
                oModel.setSizeLimit(Math.max(
                    100,
                    aSchede.length,
                    (oModel.getProperty("/posizioni") || []).length
                ));
                oModel.setProperty("/helpScheda", aSchede);
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }.bind(this)).catch(function (oError) {
                if (this._isViewRequestCurrent(iRequest)) {
                    MessageBox.error("Impossibile caricare le Schede Ricognizione.", {
                        details: oError.responseText || oError.message || String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                this._bViewHelpLoading = false;
                if (this._isViewRequestCurrent(iRequest)) {
                    oSelectionDialog.setBusy(false);
                }
            }.bind(this));
        },
        onSearchHelpScheda: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("idScheda", FilterOperator.Contains, sValue),
                        new Filter("stato", FilterOperator.Contains, sValue),
                        new Filter("uEco", FilterOperator.Contains, sValue),
                        new Filter("defUEco", FilterOperator.Contains, sValue),
                        new Filter("idBene", FilterOperator.Contains, sValue),
                        new Filter("denBene", FilterOperator.Contains, sValue),
                        new Filter("autore", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmHelpScheda: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var oScheda = oSelectedItem.getBindingContext("display").getObject();
            if (!oScheda.idScheda) {
                MessageBox.warning("La scheda selezionata non contiene un ID valido.");
                return;
            }
            var sText = oScheda.idScheda;
            if (oScheda.denBene) {
                sText += " - " + oScheda.denBene;
            }
            this.getView().getModel("schedaSelection").setData({
                idScheda: oScheda.idScheda,
                text: sText
            });
        },
        onDisplayScheda: function () {
            var oDialog = this.byId("dialogSelectScheda");
            if (oDialog.getBusy()) {
                return;
            }
            var sIdScheda = this.getView().getModel("schedaSelection").getProperty("/idScheda");
            if (!sIdScheda) {
                MessageBox.warning("Selezionare una Scheda Ricognizione.");
                return;
            }
            var iRequest = this._iViewRequest;
            oDialog.setBusyIndicatorDelay(0);
            oDialog.setBusy(true);
            this._readSchedaDetail(sIdScheda).then(function (oDetail) {
                if (!this._isViewRequestCurrent(iRequest)) {
                    return;
                }
                var aPositions = oDetail.toPosizioni && oDetail.toPosizioni.results;
                if (!Array.isArray(aPositions)) {
                    throw new Error("La risposta non contiene la raccolta toPosizioni espansa.");
                }
                if (oDetail.toPosizioni.__next) {
                    throw new Error("Il servizio ha restituito soltanto una parte delle Posizioni. È necessario completare la lettura prima di visualizzare la scheda.");
                }
                var oHeader = Object.assign({}, oDetail);
                delete oHeader.toPosizioni;
                delete oHeader.__metadata;
                var oModel = this.getView().getModel("display");
                oModel.setSizeLimit(Math.max(
                    100,
                    aPositions.length,
                    (oModel.getProperty("/helpScheda") || []).length
                ));
                oModel.setProperty("/scheda", oHeader);
                oModel.setProperty("/posizioni", aPositions);
                oModel.setProperty("/positionRowCount", Math.max(1, aPositions.length));
                this.byId("tableViewPositions").setFirstVisibleRow(0);
                oModel.setProperty("/loaded", true);
                oDialog.close();
            }.bind(this)).catch(function (oError) {
                if (this._isViewRequestCurrent(iRequest)) {
                    MessageBox.error("Impossibile caricare la Scheda Ricognizione.", {
                        details: oError.responseText || oError.message || String(oError)
                    });
                }
            }.bind(this)).finally(function () {
                if (this._isViewRequestCurrent(iRequest)) {
                    oDialog.setBusy(false);
                }
            }.bind(this));
        },
        onCancelSelectScheda: function () {
            var oDialog = this.byId("dialogSelectScheda");
            if (!oDialog.getBusy()) {
                oDialog.close();
            }
        },
        onAfterCloseSelectScheda: function () {
            if (this._bViewActive && !this.getView().getModel("display").getProperty("/loaded")) {
                this.onNavBack();
            }
        },
        _onViewBeforeHide: function () {
            this._bViewActive = false;
            this._iViewRequest += 1;
            ["dialogSelectScheda", "dialogHelpScheda"].forEach(function (sId) {
                var oControl = this.byId(sId);
                if (oControl && typeof oControl.close === "function" && oControl.isOpen && oControl.isOpen()) {
                    oControl.close();
                }
            }, this);
        },
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
        },
        onExit: function () {
            this._bViewDestroyed = true;
            this._bViewActive = false;
            this._iViewRequest += 1;
            this.getOwnerComponent().getRouter().getRoute("RouteView").detachPatternMatched(this._onRouteMatched, this);
            this.getView().removeEventDelegate(this._oViewNavigationDelegate);
            ["display", "schedaSelection"].forEach(function (sName) {
                var oModel = this.getView().getModel(sName);
                if (oModel) {
                    oModel.destroy();
                }
            }, this);
        },
    });
});