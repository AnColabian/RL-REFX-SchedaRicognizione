sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "schedaricognizione/model/formatter"
], (Controller, History, MessageBox, MessageToast, formatter) => {
    "use strict";
    return Controller.extend("schedaricognizione.controller.Create", {
        formatter: formatter,
        onInit: function () {
            this.getView().setModel(new JSONModel([]), "scheme");
            this.getView().setModel(new JSONModel([]), "oa");
            var oTemplateOptionsModel = new JSONModel([]);
            oTemplateOptionsModel.setDefaultBindingMode("OneWay");
            this.getView().setModel(oTemplateOptionsModel, "templateOptions");
            this.getView().setModel(new JSONModel({ idscheda: "" }), "templateSelection");
            this.byId("pageCreate").setTitle("Nuova Scheda Ricognizione");
            this._mCreateFragments = {};
            this._oNavigationDelegate = {
                onAfterShow: this._onCreateAfterShow,
                onBeforeHide: this._onCreateBeforeHide
            };
            this.getView().addEventDelegate(this._oNavigationDelegate, this);
            this.getOwnerComponent().getRouter().getRoute("RouteCreate").attachPatternMatched(this._onCreateRouteMatched, this);
        },
        _onCreateRouteMatched: function () {
            var aSchemes = this.getOwnerComponent().getModel("scheme").getData();
            var oNewScheme = {};
            Object.keys(aSchemes[0] || {}).forEach(function (sProperty) {
                oNewScheme[sProperty] = "";
            });
            oNewScheme.idscheda = "";
            oNewScheme.stato = "";
            oNewScheme.idsc_mdl = "";
            oNewScheme.dtcomp = this._getCurrentDate();
            this.getView().getModel("scheme").setData([oNewScheme]);
            this.getView().getModel("oa").setData([]);
            var oTemplateOptionsModel = this.getView().getModel("templateOptions");
            oTemplateOptionsModel.setSizeLimit(Math.max(aSchemes.length, 100));
            oTemplateOptionsModel.setData(JSON.parse(JSON.stringify(aSchemes)));
            this.getView().getModel("templateSelection").setData({ idscheda: "" });
            this.byId("inputSwenr").setValue("");
            this.byId("inputSgrnr").setValue("");
            this.byId("inputSgenr").setValue("");
            this.byId("tableOA").removeSelections(true);
            this._bOpenTemplateDialog = true;
        },
        _onCreateAfterShow: function () {
            this._bCreateViewVisible = true;
            if (!this._bOpenTemplateDialog) {
                return;
            }
            this._bOpenTemplateDialog = false;
            this._loadCreateFragment("ImportTemplate").then(function (oDialog) {
                if (!this._bCreateViewVisible) {
                    return;
                }
                this.byId("comboTemplateScheme").setSelectedKey("");
                this.byId("comboTemplateScheme").setValue("");
                oDialog.open();
            }.bind(this)).catch(function () {
                if (this._bCreateViewVisible) {
                    MessageBox.error("Impossibile aprire la selezione della Scheda Modello.");
                }
            }.bind(this));
        },
        _onCreateBeforeHide: function () {
            this._bCreateViewVisible = false;
            ["dialogTemplateValueHelp", "dialogImportTemplate"].forEach(function (sId) {
                var oDialog = this.byId(sId);
                if (oDialog) {
                    oDialog.close();
                }
            }, this);
        },
        _loadCreateFragment: function (sFragmentName) {
            if (!this._mCreateFragments[sFragmentName]) {
                this._mCreateFragments[sFragmentName] = this.loadFragment({
                    name: "schedaricognizione.fragment." + sFragmentName
                }).catch(function (oError) {
                    delete this._mCreateFragments[sFragmentName];
                    throw oError;
                }.bind(this));
            }
            return this._mCreateFragments[sFragmentName];
        },
        onTemplateValueHelp: function () {
            this._loadCreateFragment("TemplateValueHelp").then(function (oDialog) {
                if (!this._bCreateViewVisible) {
                    return;
                }
                oDialog.getBinding("items").filter([]);
                oDialog.open("");
            }.bind(this)).catch(function () {
                if (this._bCreateViewVisible) {
                    MessageBox.error("Impossibile aprire il matchcode della Scheda Modello.");
                }
            }.bind(this));
        },
        onSearchTemplateValueHelp: function (oEvent) {
            var sValue = (oEvent.getParameter("value") || "").trim();
            var aFilters = [];
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("idscheda", FilterOperator.Contains, sValue),
                        new Filter("txbene", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmTemplateValueHelp: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }
            var sIdScheda = oSelectedItem.getBindingContext("templateOptions").getProperty("idscheda");
            this.getView().getModel("templateSelection").setProperty("/idscheda", sIdScheda);
            this.byId("comboTemplateScheme").setSelectedKey(sIdScheda);
        },
        onImportTemplate: function () {
            var sIdScheda = this.getView().getModel("templateSelection").getProperty("/idscheda");
            var oDialog = this.byId("dialogImportTemplate");
            if (!sIdScheda) {
                MessageBox.error("Selezionare una scheda modello valida.");
                return;
            }
            oDialog.setBusy(true);
            models.readSchemeDetail(this.getOwnerComponent().getModel("scheme"), sIdScheda).then(function (oDetail) {
                if (!this._bCreateViewVisible) {
                    return;
                }
                this._applyTemplateHeader(oDetail);
                oDialog.close();
            }.bind(this)).catch(function () {
                if (this._bCreateViewVisible) {
                    MessageBox.error("Impossibile leggere il dettaglio della Scheda Modello.");
                }
            }.bind(this)).finally(function () {
                oDialog.setBusy(false);
            });
        },
        _applyTemplateHeader: function (oDetail) {
            var oModel = this.getView().getModel("scheme");
            var oScheme = oModel.getProperty("/0");
            var aExcluded = ["idscheda", "stato", "idsc_mdl", "ernam", "erdat", "erzet", "aenam", "aedat", "aezet", "dtcomp"];
            Object.keys(oDetail).forEach(function (sProperty) {
                if (aExcluded.indexOf(sProperty) === -1) {
                    oScheme[sProperty] = oDetail[sProperty];
                }
            });
            oScheme.idsc_mdl = oDetail.idscheda;
            oModel.refresh(true);
        },
        onCreateWithoutTemplate: function () {
            this.getView().getModel("templateSelection").setProperty("/idscheda", "");
            this.getView().getModel("scheme").setProperty("/0/idsc_mdl", "");
            this.byId("comboTemplateScheme").setSelectedKey("");
            this.byId("comboTemplateScheme").setValue("");
            this.byId("dialogImportTemplate").close();
        },
        onExit: function () {
            this._bCreateViewVisible = false;
            this.getOwnerComponent().getRouter().getRoute("RouteCreate").detachPatternMatched(this._onCreateRouteMatched, this);
            this.getView().removeEventDelegate(this._oNavigationDelegate);
            ["scheme", "oa", "templateOptions", "templateSelection"].forEach(function (sModelName) {
                this.getView().getModel(sModelName).destroy();
            }, this);
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
        onSearchOA: function () {
            MessageToast.show("Ricerca Oggetti Architettonici - Funzionalità da implementare");
        },
        onSelectAllOA: function () {
            var oTable = this.getView().byId("tableOA");
            var aItems = oTable.getItems();
            aItems.forEach(function (oItem) {
                var aSelectedIndices = oTable.getSelectedIndices();
                oTable.selectAll();
            });
        },
        onDeselectAllOA: function () {
            var oTable = this.getView().byId("tableOA");
            oTable.clearSelection();
        },
        onRemoveOA: function () {
            var oTable = this.getView().byId("tableOA");
            var aSelectedIndices = oTable.getSelectedIndices();
            if (aSelectedIndices.length === 0) {
                MessageToast.show("Selezionare almeno una riga");
                return;
            }
            var oModel = this.getView().getModel("oa");
            var aData = oModel.getData();
            aSelectedIndices.reverse().forEach(function (iIndex) {
                aData.splice(iIndex, 1);
            });
            oModel.refresh(true);
            oTable.clearSelection();
        },
        onSave: function () {
            var oModel = this.getView().getModel("scheme");
            var aData = oModel.getData();
            var oScheme = aData[0];
            if (!oScheme.coogis || !oScheme.fabter || !oScheme.numedi || !oScheme.numfuo || !oScheme.nument) {
                MessageBox.error("Compilare tutti i campi obbligatori");
                return;
            }
            var oTable = this.getView().byId("tableOA");
            var aTableItems = oTable.getItems();
            if (aTableItems.length === 0) {
                MessageBox.error("Inserire almeno un Oggetto Architettonico");
                return;
            }
            oScheme.stato = "B";
            oScheme.ernam = "USER001";
            oScheme.erdat = this._getCurrentDate();
            oScheme.erzet = this._getCurrentTime();
            oModel.refresh(true);
            MessageBox.success("Scheda salvata con successo", {
                onClose: function () {
                    MessageBox.confirm("Desideri generare il PDF della scheda?", {
                        onClose: function (sAction) {
                            if (sAction === MessageBox.Action.OK) {
                                MessageToast.show("Generazione PDF - Funzionalità da implementare");
                            }
                        }.bind(this)
                    });
                }.bind(this)
            });
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
        }
    });
});
