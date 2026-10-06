sap.ui.define([
    "sap/ui/core/UIComponent",
    "schedaricognizione/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("schedaricognizione.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createSchemeModel(), "scheme");
            this.setModel(models.createOAModel(), "oa");
            this.getRouter().initialize();
        }
    });
});