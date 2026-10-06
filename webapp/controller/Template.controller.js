sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/model/json/JSONModel",
"sap/m/MessageBox",
"schedaricognizione/model/models",
"schedaricognizione/model/formatter"
], (Controller, JSONModel, MessageBox, models, formatter) => {
"use strict";
return Controller.extend("schedaricognizione.controller.Template", {
formatter: formatter,
onInit: function() {
this.getView().setModel(new JSONModel({ idscheda: "" }), "templateSelection");
this.getView().setModel(new JSONModel({ scheda: {}, posizioni: [], pronto: false }), "template");
this.getOwnerComponent().getRouter().getRoute("RouteTemplate").attachPatternMatched(this._onRouteMatched, this);
},
_onRouteMatched: function(oEvent) {
var sIdScheda = oEvent.getParameter("arguments").idscheda;
this.getView().getModel("templateSelection").setProperty("/idscheda", sIdScheda || "");
this.getView().getModel("template").setData({ scheda: {}, posizioni: [], pronto: false });
},
onPrepareTemplate: function() {
var sIdScheda = this.getView().getModel("templateSelection").getProperty("/idscheda");
var aSchemes = this.getOwnerComponent().getModel("scheme").getData();
var aPositions = this.getOwnerComponent().getModel("oa").getData();
var oScheme = aSchemes.find(function(oItem) {
return oItem.idscheda === sIdScheda;
});
if (!oScheme) {
MessageBox.error(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("msgTemplateSelectScheme"));
return;
}
var oPreviousModel = this.getView().getModel("template");
this.getView().setModel(models.createTemplateModel(oScheme, aPositions), "template");
oPreviousModel.destroy();
},
onNavBack: function() {
this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
},
onExit: function() {
this.getOwnerComponent().getRouter().getRoute("RouteTemplate").detachPatternMatched(this._onRouteMatched, this);
this.getView().getModel("templateSelection").destroy();
this.getView().getModel("template").destroy();
}
});
});
