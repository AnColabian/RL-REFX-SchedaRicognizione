sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/core/routing/History",
"sap/m/MessageBox",
"sap/m/MessageToast"
], (Controller, History, MessageBox, MessageToast) => {
"use strict";
return Controller.extend("schedaricognizione.controller.Create", {
onInit: function() {
var oModel = this.getOwnerComponent().getModel("scheme");
var oOAModel = this.getOwnerComponent().getModel("oa");
this.getView().setModel(oModel, "scheme");
this.getView().setModel(oOAModel, "oa");
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
var aItems = oTable.getItems();
aItems.forEach(function(oItem) {
oItem.getCells()[0].setSelected(true);
});
},
onDeselectAllOA: function() {
var oTable = this.getView().byId("tableOA");
var aItems = oTable.getItems();
aItems.forEach(function(oItem) {
oItem.getCells()[0].setSelected(false);
});
},
onRemoveOA: function() {
var oTable = this.getView().byId("tableOA");
var aItems = oTable.getItems();
var aToRemove = [];
aItems.forEach(function(oItem) {
if (oItem.getCells()[0].getSelected()) {
aToRemove.push(oItem.getBindingContext("oa").getPath());
}
});
if (aToRemove.length === 0) {
MessageToast.show("Selezionare almeno una riga");
return;
}
var oModel = this.getView().getModel("oa");
var aData = oModel.getData();
aToRemove.reverse().forEach(function(sPath) {
var iIndex = parseInt(sPath.split("/")[1]);
aData.splice(iIndex, 1);
});
oModel.refresh(true);
},
onSave: function() {
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
onClose: function() {
MessageBox.confirm("Desideri generare il PDF della scheda?", {
onClose: function(sAction) {
if (sAction === MessageBox.Action.OK) {
MessageToast.show("Generazione PDF - Funzionalità da implementare");
}
}.bind(this)
});
}.bind(this)
});
},
onCancel: function() {
MessageBox.confirm("Sei sicuro di voler annullare? I dati non salvati andranno persi.", {
onClose: function(sAction) {
if (sAction === MessageBox.Action.OK) {
this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
}
}.bind(this)
});
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