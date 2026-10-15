sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "schedaricognizione/model/formatter"
], (Controller, formatter) => {
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
        }
    });
});