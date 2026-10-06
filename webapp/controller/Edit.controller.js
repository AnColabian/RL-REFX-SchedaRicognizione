sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/core/routing/History",
"sap/m/MessageBox",
"sap/m/MessageToast",
"schedaricognizione/model/formatter"
], (Controller, History, MessageBox, MessageToast, formatter) => {
"use strict";
return Controller.extend("schedaricognizione.controller.Edit", {
formatter: formatter,
onInit: function() {
var oRouter = this.getOwnerComponent().getRouter();
oRouter.getRoute("RouteEdit").attachPatternMatched(this._onRouteMatched, this);
var oModel = this.getOwnerComponent().getModel("scheme");
var oOAModel = this.getOwnerComponent().getModel("oa");
this.getView().setModel(oModel, "scheme");
this.getView().setModel(oOAModel, "oa");
this._iSelectedIndex = -1;
this._oOriginalScheme = null;
this._aOriginalOA = null;
},
_onRouteMatched: function(oEvent) {
this._loadSchemeForEdit();
},
_loadSchemeForEdit: function() {
var oModel = this.getView().getModel("scheme");
var aData = oModel.getData();
if (aData.length > 0) {
this._iSelectedIndex = 0;
this._oOriginalScheme = JSON.parse(JSON.stringify(aData[0]));
var oOAModel = this.getView().getModel("oa");
var aOAData = oOAModel.getData();
this._aOriginalOA = JSON.parse(JSON.stringify(aOAData));
this._applyStateVisibility(aData[0].stato);
}
},
_applyStateVisibility: function(sStato) {
var oBtnSave = this.getView().byId("btnSave");
var oBtnRelease = this.getView().byId("btnRelease");
var oBtnDelete = this.getView().byId("btnDelete");
var oPanel = this.getView().byId("panelTestata");
if (sStato === "B") {
oBtnSave.setVisible(true);
oBtnRelease.setVisible(true);
oBtnDelete.setVisible(true);
this._setEditableFields(true);
} else if (sStato === "D") {
oBtnSave.setVisible(false);
oBtnRelease.setVisible(false);
oBtnDelete.setVisible(true);
this._setEditableFields(false);
} else if (sStato === "E") {
oBtnSave.setVisible(false);
oBtnRelease.setVisible(false);
oBtnDelete.setVisible(false);
this._setEditableFields(false);
MessageBox.information("Questa scheda è stata eliminata e non può essere modificata");
}
},
_setEditableFields: function(bEditable) {
var oView = this.getView();
var aInputs = [
"inputIdSchedaModello", "inputDocval", "inputIdbene", "inputEntepr",
"inputTxbene", "inputCoogis", "selectFabter", "inputUsofab", "inputUsoter",
"inputSuplut", "inputSupfon", "inputAccess", "inputPorzed", "inputNumedi",
"inputNumfuo", "inputNument", "inputColleg", "inputStport", "inputTampon",
"inputCopert", "inputSerram", "inputPartiz", "inputFinitu", "inputImpian",
"inputPertin", "inputSupcop", "inputSupsco", "inputZonomi", "selectApe",
"inputClsene", "inputTitolo", "inputAnnopr", "inputLimiti", "inputAnnocs",
"inputStgene", "inputStspor", "inputStcope", "inputSttamp", "inputStches",
"inputStpart", "inputStfini", "inputStimpi", "inputStnote", "inputStoccu",
"inputSogocc", "inputNatocc", "inputTipocc", "inputVincol", "inputIntcul",
"inputAutali", "inputDsturb", "inputIterur", "selectTitori", "selectAnte67",
"selectAnte42", "selectCorcat", "inputCeragi", "inputCollst", "inputDocamb",
"selectVulssm", "selectVulamb", "inputStimav", "inputStimnt", "inputAnnovl",
"inputCanloc", "inputPrgprc", "inputDelibe", "inputEspgar", "inputEsitoa"
];
aInputs.forEach(function(sId) {
var oControl = oView.byId(sId);
if (oControl && oControl.setEditable) {
oControl.setEditable(bEditable);
}
});
},
onNavBack: function() {
var oHistory = History.getInstance();
var sPreviousHash = oHistory.getPreviousHash();
if (sPreviousHash !== undefined) {
window.history.go(-1);
} else {
this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
}
},
onSearchOA: function() {
MessageToast.show("Ricerca Oggetti Architettonici - Funzionalità da implementare");
},
onSelectAllOA: function() {
var oTable = this.getView().byId("tableOA");
oTable.selectAll();
},
onDeselectAllOA: function() {
var oTable = this.getView().byId("tableOA");
oTable.clearSelection();
},
onRemoveOA: function() {
var oTable = this.getView().byId("tableOA");
var aSelectedIndices = oTable.getSelectedIndices();
if (aSelectedIndices.length === 0) {
MessageToast.show("Selezionare almeno una riga");
return;
}
var oModel = this.getView().getModel("oa");
var aData = oModel.getData();
aSelectedIndices.reverse().forEach(function(iIndex) {
aData.splice(iIndex, 1);
});
oModel.refresh(true);
oTable.clearSelection();
},
onSave: function() {
var oModel = this.getView().getModel("scheme");
var aData = oModel.getData();
var oScheme = aData[0];
var sStato = oScheme.stato;
if (sStato !== "B") {
MessageBox.error("Solo le schede in stato Bozza possono essere modificate");
return;
}
if (this._checkModifications()) {
oScheme.aenam = "USER001";
oScheme.aedat = this._getCurrentDate();
oScheme.aezet = this._getCurrentTime();
oModel.refresh(true);
MessageBox.success("Scheda aggiornata con successo");
} else {
MessageBox.information("Nessuna modifica rilevata");
}
},
onRelease: function() {
var oModel = this.getView().getModel("scheme");
var aData = oModel.getData();
var oScheme = aData[0];
if (oScheme.stato !== "B") {
MessageBox.error("Solo le schede in stato Bozza possono essere rilasciate");
return;
}
MessageBox.confirm("Sei sicuro di voler rilasciare la scheda in stato Definitiva?", {
onClose: function(sAction) {
if (sAction === MessageBox.Action.OK) {
oScheme.stato = "D";
oScheme.aenam = "USER001";
oScheme.aedat = this._getCurrentDate();
oScheme.aezet = this._getCurrentTime();
oModel.refresh(true);
this._applyStateVisibility("D");
MessageBox.success("Scheda rilasciata in stato Definitiva");
}
}.bind(this)
});
},
onDelete: function() {
var oModel = this.getView().getModel("scheme");
var aData = oModel.getData();
var oScheme = aData[0];
var sStato = oScheme.stato;
var sMessage = sStato === "B" ? "Sei sicuro di voler eliminare questa scheda?" : "Sei sicuro di voler eliminare questa scheda in stato Definitiva?";
MessageBox.confirm(sMessage, {
onClose: function(sAction) {
if (sAction === MessageBox.Action.OK) {
oScheme.stato = "E";
oScheme.aenam = "USER001";
oScheme.aedat = this._getCurrentDate();
oScheme.aezet = this._getCurrentTime();
oModel.refresh(true);
this._applyStateVisibility("E");
MessageBox.success("Scheda eliminata con successo");
}
}.bind(this)
});
},
onCancel: function() {
MessageBox.confirm("Sei sicuro di voler annullare? Le modifiche non salvate andranno perse.", {
onClose: function(sAction) {
if (sAction === MessageBox.Action.OK) {
this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
}
}.bind(this)
});
},
_checkModifications: function() {
var oModel = this.getView().getModel("scheme");
var aData = oModel.getData();
var oCurrentScheme = aData[0];
for (var sKey in this._oOriginalScheme) {
if (this._oOriginalScheme[sKey] !== oCurrentScheme[sKey]) {
return true;
}
}
var oOAModel = this.getView().getModel("oa");
var aCurrentOA = oOAModel.getData();
if (this._aOriginalOA.length !== aCurrentOA.length) {
return true;
}
for (var i = 0; i < this._aOriginalOA.length; i++) {
for (var sProp in this._aOriginalOA[i]) {
if (this._aOriginalOA[i][sProp] !== aCurrentOA[i][sProp]) {
return true;
}
}
}
return false;
},
_getCurrentDate: function() {
var oDate = new Date();
var iYear = oDate.getFullYear();
var iMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
var iDay = ("0" + oDate.getDate()).slice(-2);
return iYear + iMonth + iDay;
},
_getCurrentTime: function() {
var oDate = new Date();
var iHours = ("0" + oDate.getHours()).slice(-2);
var iMinutes = ("0" + oDate.getMinutes()).slice(-2);
var iSeconds = ("0" + oDate.getSeconds()).slice(-2);
return iHours + iMinutes + iSeconds;
}
});
});
