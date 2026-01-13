sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, History) {
    "use strict";

    return Controller.extend("sap.ui.demo.odata.controller.Worklist", {

        onInit: function () {
        },

        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.byId("tableHeader").setText(sTitle);
        },

        onPress: function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        onAdd: function () {
            this.getRouter().navTo("object", {
                objectId: "new"
            });
        },

        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getProperty("Guid")
            });
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onLogout: function () {
            // Destroy the OData model to clear credentials
            var oModel = this.getOwnerComponent().getModel();
            if (oModel) {
                oModel.destroy();
                this.getOwnerComponent().setModel(null);
            }
            // Navigate back to login
            this.getRouter().navTo("login");
        }
    });
});
