sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, History, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("sap.ui.demo.odata.controller.Object", {

        onInit: function () {
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            var oModel = this.getOwnerComponent().getModel();

            this.getView().unbindElement();

            if (sObjectId === "new") {
                // Create mode
                var oContext = oModel.createEntry("/SummarySet", {
                    properties: {
                        // Default values if needed
                        Tarih: new Date(),
                        Sure: 8.0,
                        LokasyonType: "U"
                    }
                });
                this.getView().setBindingContext(oContext);
            } else {
                // Edit mode
                // Use createKey to generate the correct path (handles guid'...' wrapper automatically)
                var sPath = oModel.createKey("/SummarySet", {
                    Guid: sObjectId
                });

                this.getView().bindElement({
                    path: sPath,
                    events: {
                        dataReceived: function (oData) {
                            if (!oData) {
                                // Element not found
                            }
                        }
                    }
                });
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            // Revert changes if strictly needed, but careful dependent on model mode
            var oModel = this.getView().getModel();
            if (oModel.hasPendingChanges()) {
                oModel.resetChanges();
            }

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("worklist", {}, true);
            }
        },

        onSave: function () {
            var oModel = this.getView().getModel();
            var that = this;

            if (oModel.hasPendingChanges()) {
                oModel.submitChanges({
                    success: function () {
                        MessageToast.show(that.getResourceBundle().getText("saveSuccess"));
                        that.onNavBack();
                    },
                    error: function (oError) {
                        try {
                            var oResponse = JSON.parse(oError.responseText);
                            MessageBox.error(oResponse.error.message.value);
                        } catch (e) {
                            MessageBox.error(that.getResourceBundle().getText("saveError"));
                        }
                    }
                });
            } else {
                MessageToast.show(this.getResourceBundle().getText("noChanges"));
            }
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
