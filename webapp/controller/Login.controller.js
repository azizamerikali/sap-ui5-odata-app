sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageBox"
], function (Controller, JSONModel, ODataModel, MessageBox) {
    "use strict";

    return Controller.extend("sap.ui.demo.odata.controller.Login", {

        onInit: function () {
            // Create a local model for login form
            // Use proxy URL instead of direct SAP URL
            var oLoginModel = new JSONModel({
                username: "",
                password: "",
                serviceUrl: "http://localhost:3000/sap/",
                errorMessage: ""
            });
            this.getView().setModel(oLoginModel);
        },

        onLogin: function () {
            var oModel = this.getView().getModel();
            var sUsername = oModel.getProperty("/username");
            var sPassword = oModel.getProperty("/password");
            var sServiceUrl = oModel.getProperty("/serviceUrl");

            // Validation
            if (!sUsername || !sPassword) {
                oModel.setProperty("/errorMessage", this.getResourceBundle().getText("loginErrorEmpty"));
                return;
            }

            // Clear previous error
            oModel.setProperty("/errorMessage", "");

            // Create Basic Auth header
            var sAuth = "Basic " + btoa(sUsername + ":" + sPassword);

            var that = this;

            // Show busy indicator
            sap.ui.core.BusyIndicator.show(0);

            // Create OData model with Basic Auth through proxy
            var oDataModel = new ODataModel(sServiceUrl, {
                headers: {
                    "Authorization": sAuth
                },
                useBatch: false,
                disableHeadRequestForToken: true,
                tokenHandling: false,
                json: true
            });

            // Set timeout for metadata loading
            var timeoutId = setTimeout(function () {
                sap.ui.core.BusyIndicator.hide();
                oModel.setProperty("/errorMessage", that.getResourceBundle().getText("loginErrorTimeout"));
            }, 15000);

            // Test connection by reading metadata
            oDataModel.metadataLoaded().then(function () {
                clearTimeout(timeoutId);
                sap.ui.core.BusyIndicator.hide();

                // Store credentials in the model for later use (session only, not persisted)
                oDataModel.setHeaders({
                    "Authorization": sAuth
                });

                // Set the OData model as the default model on the component
                that.getOwnerComponent().setModel(oDataModel);

                // Navigate to worklist
                that.getRouter().navTo("worklist");

            }).catch(function (oError) {
                clearTimeout(timeoutId);
                sap.ui.core.BusyIndicator.hide();

                var sErrorMsg = that.getResourceBundle().getText("loginErrorFailed");

                if (oError && oError.message) {
                    sErrorMsg = oError.message;
                }

                oModel.setProperty("/errorMessage", sErrorMsg);
            });

            // Also handle request failed
            oDataModel.attachRequestFailed(function (oEvent) {
                clearTimeout(timeoutId);
                sap.ui.core.BusyIndicator.hide();

                var oResponse = oEvent.getParameter("response");
                var sErrorMsg = that.getResourceBundle().getText("loginErrorFailed");

                if (oResponse && oResponse.statusCode === 401) {
                    sErrorMsg = that.getResourceBundle().getText("loginErrorUnauthorized");
                }

                oModel.setProperty("/errorMessage", sErrorMsg);
            });
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
