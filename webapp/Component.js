sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
	"use strict";

	return UIComponent.extend("sap.ui.demo.odata.Component", {

		metadata: {
			manifest: "json"
		},

		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			this.setModel(oModel, "device");

			// Attempt to restore session from localStorage if model is missing
			this._restoreSession();
		},

		_restoreSession: function () {
			try {
				var sSyst = localStorage.getItem("SYST");
				if (sSyst) {
					var oSettings = JSON.parse(sSyst);

					// Re-calculate proxy URL (similar logic to Login.controller)
					var sProxyUrl = "/sap/"; // Default relative
					var sCurrentHost = window.location.host;
					if (sCurrentHost.includes('localhost') || sCurrentHost.includes('127.0.0.1')) {
						sProxyUrl = "/sap/";
					} else {
						sProxyUrl = "/api/sap/";
					}

					// Check if we are on BTP
					var sServiceUrl = sProxyUrl;
					var sServicePath = oSettings.servicePath || "/sap/opu/odata/sap/YMONO_AKT_PLN_SRV";

					if (window.location.hostname.includes("hana.ondemand.com")) {
						sServiceUrl = sServicePath;
					}

					// For local development, assume sServiceUrl is the base for the proxy, but ODataModel needs the full service URL?
					// Login.controller uses sServiceUrl which is set to sProxyUrl (http://localhost:3000/sap/) or sServicePath.
					// But wait, Login controller sets sServiceUrl from the model property which is initialized with sProxyUrl.
					// AND ODataModel constructor takes that.
					// BUT, if sServiceUrl is "http://localhost:3000/sap/", that's not a service URL. That's a proxy root.
					// The ODataModel constructor usually expects the URL to the service root (ending in .svc or /Service/).
					// Let's check Login.controller again.
					// "var oDataModel = new ODataModel(sServiceUrl, ..."
					// In Login, oLoginModel defaults serviceUrl to sProxyUrl.
					// Wait, this looks suspicious. If sProxyUrl is just ".../sap/", calling oDataModel on it might fail unless it redirects?
					// Ah, the proxy handles "/sap/*".
					// The default path in Login is "/sap/opu/odata/sap/YMONO_AKT_PLN_SRV".
					// In Login.controller: 
					// sServiceUrl = oModel.getProperty("/serviceUrl"); (Which is http://localhost:3000/sap/)
					// BUT LATER: 
					// "if (window.location.hostname.includes("hana.ondemand.com")) { sServiceUrl = sServicePath; }"
					// If LOCAL, sServiceUrl remains "http://localhost:3000/sap/".
					// Then "new ODataModel(sServiceUrl, ...)"
					// Then "oDataModel.read("/SummarySet")" -> http://localhost:3000/sap/SummarySet
					// This works because the proxy maps /sap/* to target.

					// So we should use the same logic.

					sap.ui.require(["sap/ui/model/odata/v2/ODataModel"], function (ODataModel) {
						var oDataModel = new ODataModel(sServiceUrl, {
							headers: {
								"X-SAP-Target-URL": oSettings.serverAddress + oSettings.servicePath,
								"sap-language": oSettings.language,
								"sap-langu": oSettings.language
							},
							useBatch: false,
							disableHeadRequestForToken: true,
							tokenHandling: false,
							json: true
						});

						// Attach Metadata Failed to redirect to login
						oDataModel.attachMetadataFailed(function () {
							this.getRouter().navTo("login");
						}.bind(this));

						this.setModel(oDataModel);
					}.bind(this));
				}
			} catch (e) {
				console.error("Session restoration failed", e);
			}
		}
	});
});
