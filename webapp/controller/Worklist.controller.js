sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, History, Filter, FilterOperator, Fragment) {
    "use strict";

    return Controller.extend("sap.ui.demo.odata.controller.Worklist", {

        onInit: function () {
        },

        /* =========================================================== */
        /* Filtering & Searching                                       */
        /* =========================================================== */

        onSearch: function (oEvent) {
            this.onFilterSearch();
        },

        onFilterSearch: function () {
            var aTableFilters = [];

            // 1. Global Search
            var sQuery = this.byId("searchField").getValue();
            if (sQuery && sQuery.length > 0) {
                var aGlobalFilters = [
                    new Filter("Personel", FilterOperator.Contains, sQuery),
                    new Filter("PersonelAdi", FilterOperator.Contains, sQuery),
                    new Filter("Proje", FilterOperator.Contains, sQuery),
                    new Filter("ProjeTxt", FilterOperator.Contains, sQuery),
                    new Filter("Customer", FilterOperator.Contains, sQuery)
                ];
                aTableFilters.push(new Filter({ filters: aGlobalFilters, and: false }));
            }

            // 2. Specific Filters
            // Personel
            var sPersonel = this.byId("searchPersonel").getValue();
            if (sPersonel) {
                aTableFilters.push(new Filter("Personel", FilterOperator.EQ, sPersonel));
            }

            // Project
            var sProject = this.byId("searchProject").getValue();
            if (sProject) {
                aTableFilters.push(new Filter("Proje", FilterOperator.EQ, sProject));
            }

            // Date Range
            var oDateRange = this.byId("searchDate");
            var dDateValue = oDateRange.getDateValue();
            var dSecondDateValue = oDateRange.getSecondDateValue();

            if (dDateValue && dSecondDateValue) {
                aTableFilters.push(new Filter("Tarih", FilterOperator.BT, dDateValue, dSecondDateValue));
            } else if (dDateValue) {
                aTableFilters.push(new Filter("Tarih", FilterOperator.EQ, dDateValue));
            }

            // Apply Filters to Table
            var oTable = this.byId("table");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aTableFilters, "Application");
        },

        onFilterClear: function () {
            this.byId("searchField").setValue("");
            this.byId("searchPersonel").setValue("");
            this.byId("searchProject").setValue("");
            this.byId("searchDate").setValue(null);

            this.onFilterSearch();
        },

        /* =========================================================== */
        /* Value Help (Search Help) implementation                     */
        /* =========================================================== */

        onValueHelpRequest: function (oEvent) {
            var oSource = oEvent.getSource();
            var sColumn = oSource.data("col"); // "Personel" or "Proje"

            this._sValueHelpInputId = oSource.getId();

            if (!this._oValueHelpDialog) {
                Fragment.load({
                    name: "sap.ui.demo.odata.view.ValueHelpDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oValueHelpDialog = oDialog;
                    this.getView().addDependent(this._oValueHelpDialog);
                    this._openValueHelpDialog(sColumn);
                }.bind(this));
            } else {
                this._openValueHelpDialog(sColumn);
            }
        },

        _openValueHelpDialog: function (sColumn) {
            var sTitle, sBindingPath, sKeyInfo, sDescInfo;

            // Configure dialog based on requested column
            if (sColumn === "Personel") {
                sTitle = this.getResourceBundle().getText("tableNameColumnTitle");
                sBindingPath = "/SummarySet"; // Ideally distinct, but mapping to SummarySet for demo
                sKeyInfo = "Personel";
                sDescInfo = "PersonelAdi";
            } else if (sColumn === "Proje") {
                sTitle = this.getResourceBundle().getText("tableProjectColumnTitle");
                sBindingPath = "/SummarySet";
                sKeyInfo = "Proje";
                sDescInfo = "ProjeTxt";
            }

            this._oValueHelpDialog.setTitle(sTitle);

            // Bind items standard way
            // Using a StandardListItem that maps title and description dynamically
            // Note: Since we are reusing /SummarySet, valid items repeat. 
            // In a real scenario we'd use a dedicated EntitySet or a JSONModel with distinct values.

            this._oValueHelpDialog.bindAggregation("items", {
                path: sBindingPath,
                template: new sap.m.StandardListItem({
                    title: "{" + sKeyInfo + "}",
                    description: "{" + sDescInfo + "}",
                    type: "Active"
                }),
                // We assume OData handling simple filtering
            });

            this._oValueHelpDialog.open();
        },

        onValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            // We need to know which column we are searching to apply correct filter field
            var oBinding = oEvent.getSource().getBinding("items");
            var oTemplate = oBinding.getInfo().template;

            // Extract the binding paths from the template used
            // This is a bit hacky but works since we just bound it:
            var sKeyPath = oTemplate.getBindingPath("title");
            var sDescPath = oTemplate.getBindingPath("description");

            var oFilterKey = new Filter(sKeyPath, FilterOperator.Contains, sValue);
            var oFilterDesc = new Filter(sDescPath, FilterOperator.Contains, sValue);

            oBinding.filter([new Filter([oFilterKey, oFilterDesc], false)]);
        },

        onValueHelpConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sInputId = this._sValueHelpInputId;
                var oInput = sap.ui.getCore().byId(sInputId); // OR this.byId if ID was stable relative to view
                // Since fragment ID might differ, we stored the Source ID initially
                // Note: .byId() works for view components. 

                // If the input is in the view, simpler:
                var oInputControl = sap.ui.getCore().byId(this._sValueHelpInputId);
                if (!oInputControl) {
                    // Fallback if not found globally (rare if using stable IDs within view)
                    // But ID contains View ID prefix usually.
                    // Actually, oSource.getId() returns the full global ID.
                    oInputControl = sap.ui.getCore().byId(this._sValueHelpInputId);
                }

                if (oInputControl) {
                    oInputControl.setValue(oSelectedItem.getTitle());
                }
            }
            // Trigger filtering immediately? Optional.
            // this.onFilterSearch();
        },

        onValueHelpCancel: function () {
            // No action
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
