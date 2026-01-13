sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageBox"
], function (Controller, JSONModel, ODataModel, MessageBox) {
    "use strict";

    return Controller.extend("sap.ui.demo.odata.controller.Login", {

        onInit: function () {
            // Detect if running on Vercel or locally
            var sCurrentHost = window.location.host;
            var sProxyUrl;

            if (sCurrentHost.includes('localhost') || sCurrentHost.includes('127.0.0.1')) {
                // Local development - use local proxy
                sProxyUrl = "http://localhost:3000/sap/";
            } else {
                // Vercel deployment - use serverless function
                sProxyUrl = "/api/sap/";
            }

            // Defaults
            var sDefaultServerAddress = "https://78.186.247.89:44302";
            var sDefaultServicePath = "/sap/opu/odata/sap/YMONO_AKT_PLN_SRV";
            var sDefaultLanguage = "TR";

            // Load settings from local storage (SYST structure)
            var oSettings = this._loadSettings();

            if (oSettings) {
                sDefaultServerAddress = oSettings.serverAddress || sDefaultServerAddress;
                sDefaultServicePath = oSettings.servicePath || sDefaultServicePath;
                sDefaultLanguage = oSettings.language || sDefaultLanguage;

                // Set UI language based on stored setting
                sap.ui.getCore().getConfiguration().setLanguage(sDefaultLanguage);
            }

            // Create a local model for login form
            var oLoginModel = new JSONModel({
                username: "",
                password: "",
                serviceUrl: sProxyUrl,
                serverAddress: sDefaultServerAddress,
                servicePath: sDefaultServicePath,
                language: sDefaultLanguage,
                showSettings: false,
                errorMessage: ""
            });
            this.getView().setModel(oLoginModel);
        },

        onToggleSettings: function () {
            var oModel = this.getView().getModel();
            var bShow = oModel.getProperty("/showSettings");
            oModel.setProperty("/showSettings", !bShow);
        },

        _loadSettings: function () {
            try {
                var sSyst = localStorage.getItem("SYST");
                if (sSyst) {
                    return JSON.parse(sSyst);
                }
            } catch (e) {
                console.error("Failed to load settings from local storage", e);
            }
            return null;
        },

        _saveSettings: function (sServerAddress, sServicePath, sLanguage) {
            try {
                var oSettings = {
                    serverAddress: sServerAddress,
                    servicePath: sServicePath,
                    language: sLanguage
                };
                localStorage.setItem("SYST", JSON.stringify(oSettings));
            } catch (e) {
                console.error("Failed to save settings to local storage", e);
            }
        },

        onLogin: function () {
            var oModel = this.getView().getModel();
            var sUsername = oModel.getProperty("/username");
            var sPassword = oModel.getProperty("/password");
            var sServiceUrl = oModel.getProperty("/serviceUrl");
            var sServerAddress = oModel.getProperty("/serverAddress");
            var sServicePath = oModel.getProperty("/servicePath");
            var sLanguage = oModel.getProperty("/language");

            // Construct full SAP Server URL
            // Ensure no double slashes between address and path
            if (sServerAddress.endsWith("/")) sServerAddress = sServerAddress.slice(0, -1);
            if (!sServicePath.startsWith("/")) sServicePath = "/" + sServicePath;

            var sSapServerUrl = sServerAddress + sServicePath;

            // Save settings to local storage (SYST)
            this._saveSettings(sServerAddress, sServicePath, sLanguage);

            // Validation
            if (!sUsername || !sPassword) {
                oModel.setProperty("/errorMessage", this.getResourceBundle().getText("loginErrorEmpty"));
                return;
            }

            if (!sServerAddress || !sServicePath) {
                oModel.setProperty("/errorMessage", this.getResourceBundle().getText("loginErrorNoServer"));
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
                    "Authorization": sAuth,
                    "X-SAP-Target-URL": sSapServerUrl,
                    "sap-language": sLanguage,
                    "sap-langu": sLanguage
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
            // Test connection by reading metadata
            oDataModel.metadataLoaded().then(function () {
                // Metadata might be cached in browser, so it resolves even with wrong password!
                // We must verify the login by making a real read request

                oDataModel.read("/SummarySet", {
                    urlParameters: {
                        "$top": 1
                    },
                    success: function () {
                        // Login verified!
                        clearTimeout(timeoutId);
                        sap.ui.core.BusyIndicator.hide();

                        // Store credentials in the model for later use (session only, not persisted)
                        oDataModel.setHeaders({
                            "Authorization": sAuth,
                            "X-SAP-Target-URL": sSapServerUrl,
                            "sap-language": sLanguage,
                            "sap-langu": sLanguage
                        });

                        // Set the OData model as the default model on the component
                        that.getOwnerComponent().setModel(oDataModel);

                        // Navigate to worklist
                        that.getRouter().navTo("worklist");
                    },
                    error: function (oError) {
                        // Login failed (probably 401)
                        clearTimeout(timeoutId);
                        sap.ui.core.BusyIndicator.hide();

                        var sErrorMsg = that._parseResponseError(oError);
                        oModel.setProperty("/errorMessage", sErrorMsg);
                    }
                });

            }).catch(function (oError) {
                clearTimeout(timeoutId);
                sap.ui.core.BusyIndicator.hide();

                var sErrorMsg = that._getErrorMessage(oError);
                oModel.setProperty("/errorMessage", sErrorMsg);
            });

            // Also handle request failed
            oDataModel.attachRequestFailed(function (oEvent) {
                clearTimeout(timeoutId);
                sap.ui.core.BusyIndicator.hide();

                sap.ui.core.BusyIndicator.hide();

                var oResponse = oEvent.getParameter("response");
                var sErrorMsg = that._parseResponseError(oResponse);
                oModel.setProperty("/errorMessage", sErrorMsg);
            });
        },

        onChangeLanguage: function (oEvent) {
            var sLanguage = oEvent.getParameter("selectedItem").getKey();

            // Set UI5 Core configuration language
            sap.ui.getCore().getConfiguration().setLanguage(sLanguage);

            // Re-bind texts for the view (optional, but good practice for instant update)
            // But usually setLanguage triggers automatic update of resource models
        },

        _getErrorMessage: function (oError) {
            // Check if it's a network/connection error
            if (!oError) {
                return this.getResourceBundle().getText("loginErrorFailed");
            }

            // Check for status code in error
            if (oError.statusCode === 401 || (oError.message && oError.message.includes("401"))) {
                return this.getResourceBundle().getText("loginErrorUnauthorized");
            }

            // Check for network errors
            if (oError.message && (oError.message.includes("Failed to fetch") ||
                oError.message.includes("NetworkError") ||
                oError.message.includes("CORS"))) {
                return this.getResourceBundle().getText("loginErrorNetwork");
            }

            // Return the actual error message for debugging
            if (oError.message) {
                return oError.message;
            }

            return this.getResourceBundle().getText("loginErrorFailed");
        },

        _parseResponseError: function (oResponse) {
            if (!oResponse) {
                return this.getResourceBundle().getText("loginErrorFailed");
            }

            var statusCode = oResponse.statusCode;

            // 401 Unauthorized - wrong username/password
            if (statusCode === 401) {
                return this.getResourceBundle().getText("loginErrorUnauthorized");
            }

            // 403 Forbidden - no permission
            if (statusCode === 403) {
                return this.getResourceBundle().getText("loginErrorForbidden");
            }

            // 404 Not Found - service not found
            if (statusCode === 404) {
                return this.getResourceBundle().getText("loginErrorNotFound");
            }

            // 500+ Server errors
            if (statusCode >= 500) {
                return this.getResourceBundle().getText("loginErrorServer");
            }

            // Try to parse SAP error message from response body
            if (oResponse.responseText) {
                try {
                    var oErrorBody = JSON.parse(oResponse.responseText);
                    if (oErrorBody.error && oErrorBody.error.message && oErrorBody.error.message.value) {
                        return oErrorBody.error.message.value;
                    }
                } catch (e) {
                    // Not JSON, check for HTML error
                    if (oResponse.responseText.includes("401") || oResponse.responseText.includes("Unauthorized")) {
                        return this.getResourceBundle().getText("loginErrorUnauthorized");
                    }
                }
            }

            // Default error with status code
            if (statusCode) {
                return this.getResourceBundle().getText("loginErrorWithCode", [statusCode]);
            }

            return this.getResourceBundle().getText("loginErrorFailed");
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
