sap.ui.define([
    "schedaricognizione/controller/BaseController",
    +    "sap/ui/model/json/JSONModel",
    +    "sap/ui/model/Filter",
    +    "sap/ui/model/FilterOperator",
    +    "sap/m/MessageBox",
    "sap/m/MessageToast",
], (BaseController, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) => {
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
            MessageToast.show("Esportazione Excel - Funzionalità da implementare");
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
            ["dialogHelpScheda", "dialogSelectScheda"].forEach(function (sId) {
                var oDialog = this.byId(sId);
                if (oDialog) {
                    oDialog.close();
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
