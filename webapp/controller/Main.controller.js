sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/core/routing/History"
], (Controller, History) => {
"use strict";
return Controller.extend("schedaricognizione.controller.Main", {
onInit: function() {
},
onNewScheme: function() {
this.getOwnerComponent().getRouter().navTo("RouteCreate");
},
onEditScheme: function() {
this.getOwnerComponent().getRouter().navTo("RouteEdit");
},
onViewScheme: function() {
this.getOwnerComponent().getRouter().navTo("RouteView");
}
});
});