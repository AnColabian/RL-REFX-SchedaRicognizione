sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/core/routing/History",
"sap/m/MessageToast"
], (Controller, History, MessageToast) => {
"use strict";
return Controller.extend("schedaricognizione.controller.View", {
onInit: function() {
var oRouter = this.getOwnerComponent().getRouter();
oRouter.getRoute("RouteView").attachPatternMatched(this._onRouteMatched, this);
var oModel = this.getOwnerComponent().getModel("scheme");
var oOAModel = this.getOwnerComponent().getModel("oa");
this.getView().setModel(oModel, "scheme");
this.getView().setModel(oOAModel, "oa");
},
_onRouteMatched: function(oEvent) {
this._loadSchemeForView();
},
_loadSchemeForView: function() {
var oModel = this.getView().getModel("scheme");
var aData = oModel.getData();
if (aData.length > 0) {
var oBinding = this.getView().bindElement({
path: "/0",
model: "scheme"
});
}
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
onExportPDF: function() {
MessageToast.show("Esportazione PDF - Funzionalità da implementare");
},
onExportExcel: function() {
MessageToast.show("Esportazione Excel - Funzionalità da implementare");
}
});
});