/*
 * Copyright (c) 2011 Imaginea Technologies Private Ltd.
 * Hyderabad, India
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following condition
 * is met:
 *
 *     + Neither the name of Imaginea, nor the
 *       names of its contributors may be used to endorse or promote
 *       products derived from this software.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
YUI({
    filter: 'raw'
}).use("alert-dialog", "utility", "dialog-box", "yes-no-dialog", "io-base", "node", "json-parse", "event-delegate", "node-event-simulate", "stylize", "custom-datatable", function (Y) {
    // TODO: make loading panel module
    var dbDiv, loadingPanel;
    Y.namespace('com.imaginea.mongoV');
    var MV = Y.com.imaginea.mongoV; /* HANDLER FUNCTIONS */
    var parseAddCollResponse = function (responseObject) {
            var parsedResponse = Y.JSON.parse(responseObject.responseText);
            response = parsedResponse.response.result;
            if (response !== undefined) {
                MV.showAlertDialog("[0] added to [1]".format(Y.one("#newName").get("value"), Y.one("#currentDB").get("value")), MV.infoIcon);
                Y.log("[0] created in [1]".format(Y.one("#newName").get("value"), Y.one("#currentDB").get("value")), "info");
                Y.one("#currentColl").set("value", "");
                Y.one("#" + Y.one("#currentDB").get("value")).simulate("click");
            } else {
                var error = parsedResponse.response.error;
                MV.showAlertDialog("Could not add Collection! [0]".format(MV.errorCodeMap[error.code]), MV.warnIcon);
                Y.log("Could not add Collection! [0]".format(MV.errorCodeMap[error.code]), "error");
            }
        };
    var showError = function (responseObject) {
            MV.showAlertDialog("Collection creation failed! Please check if app server is runnning.", MV.warnIcon);
            Y.log("Collection creation failed. Response Status: [0]".format(responseObject.statusText), "error");
        };
    var sendDropDBRequest = function () {
            Y.log("Preparing to send request to drop DB", "info");
            var request = Y.io(MV.URLMap.dropDB(), {
                method: "POST",
                on: {
                    success: function (ioId, responseObject) {
                        var parsedResponse = Y.JSON.parse(responseObject.responseText);
                        if (parsedResponse.response.result !== undefined) {
                            MV.showAlertDialog("[0] is dropped! ".format(Y.one("#currentDB").get("value")), MV.infoIcon, function () {
                                window.location = "home.html?tokenID=" + Y.one("#tokenID").get("value") + "&username=" + Y.one("#username").get("value") + "&host=" + Y.one("#host").get("value");
                            });
                            Y.log("[0] dropped".format(Y.one("#currentDB").get("value")), "info");
                            Y.one("#currentDB").set("value", "");
                        } else {
                            var error = parsedResponse.response.error;
                            MV.showAlertDialog("Could not drop: [0]. [1]".format(Y.one("#currentDB").get("value"), MV.errorCodeMap[error.code]), MV.warnIcon);
                            Y.log("Could not drop: [0], Response Recieved: [1], ErrorCode: [2]".format(Y.one("#currentDB").get("value"), error.message, error.code), "error");
                        }
                    },
                    failure: function (ioId, responseObject) {
                        Y.log("Could not drop: [0]. Status Text: [1]".format(Y.one("#currentDB").get("value"), responseObject.statusText), "error");
                        MV.showAlertDialog("Could not drop: [0], Status Text: [2]".format(Y.one("#currentDB").get("value"), responseObject.statusText), MV.warnIcon);
                    }
                }
            });
            this.hide();
        };
    var handleNo = function (dialog) {
            this.hide();
        };
    var executeContextMenuOption = function (eventType, args) {
            var menuItem = args[1]; // The MenuItem that was clicked
            Y.one("#currentDB").set("value", this.contextEventTarget.id);
            MV.toggleClass(Y.one("#" + Y.one("#currentDB").get("value")), Y.all("#dbNames li"));
            switch (menuItem.index) {
            case 0:
                // Delete database
                dialog = MV.showYesNoDialog("Do you really want to drop the Database?", sendDropDBRequest, handleNo);
                break;
            case 1:
                // add collection
                var form = "addColDialog";
                MV.getDialog(form, parseAddCollResponse, showError);
                break;
            case 2:
                // show statistics
                MV.hideQueryForm();
                MV.createDatatable(MV.URLMap.dbStatistics(), Y.one("#currentDB").get("value"));
                break;
            }
        };
    var dbContextMenu = new YAHOO.widget.ContextMenu("dbContextMenuID", {
        trigger: "dbNames",
        itemData: ["Delete Database", "Add Collection", "Statistics"]
    });
    dbContextMenu.render("dbContextMenu");
    dbContextMenu.clickEvent.subscribe(executeContextMenuOption);
    // A function handler to use for successful requests to get DB names:

    function parseGetDBResponse(ioId, responseObject) {
        Y.log("Response Recieved of get DB request", "info");
        try {
            var parsedResponse = Y.JSON.parse(responseObject.responseText);
            if (parsedResponse.response.result !== undefined) {
                var info, index, dbNames = "";
                for (index = 0; index < parsedResponse.response.result.length; index++) {
                    dbNames += "<li id='[0]' >[1]</li>".format(parsedResponse.response.result[index], parsedResponse.response.result[index]);
                }
                if (index === 0) {
                    dbDiv.set("innerHTML", "No Databases");
                }
                dbDiv.set("innerHTML", dbNames);
                Y.one('#user').set("innerHTML", Y.one("#username").get("value"));
                Y.one('#hostname').set("innerHTML", Y.one("#host").get("value"));
                loadingPanel.hide();
                Y.log("Database Names succesfully loaded", "info");
            } else {
                var error = parsedResponse.response.error;
                Y.log("Could not load databases. Message from server: [0]. Error Code from server:[1] ".format(error.message, error.code), "error");
                MV.showAlertDialog(MV.errorCodeMap[error.code], MV.warnIcon);
                loadingPanel.hide();
            }
        } catch (e) {
            MV.showAlertDialog(e, MV.warnIcon);
        }
    }
    // A function handler to use for failed requests to get DB names:

    function displayError(ioId, responseObject) {
        Y.log("Could not load the databases", "error");
        Y.log("Status code message: [0]".format(responseObject.statusText), "error");
        loadingPanel.hide();
        MV.showAlertDialog("Could not load collections! Please check if the app server is running. Status Text: [0]".format(responseObject.statustext), MV.warnIcon);
    }
    var getParameters = function () {
            var params = [];
            var fullUrl = window.location.search;
            while (fullUrl.indexOf("&") !== -1) {
                params.push(fullUrl.substring(fullUrl.indexOf("=") + 1, fullUrl.indexOf("&")));
                fullUrl = fullUrl.substring(fullUrl.indexOf("&") + 1);
            }
            params.push(fullUrl.substring(fullUrl.indexOf("=") + 1));
            return params;
        };
    var requestDBNames = function () {
            loadingPanel = new LoadingPanel("Loading Databases...");
            loadingPanel.show();
            dbDiv = Y.one('#dbNames ul.lists');
            var params = getParameters();
            Y.log(params[0], "info");
            Y.one("#tokenID").set("value", params[0]);
            Y.one("#username").set("value", params[1]);
            Y.one("#host").set("value", params[2]);
            var request = Y.io(MV.URLMap.getDBs(),
            // configuration for loading the database names
            {
                method: "GET",
                on: {
                    success: parseGetDBResponse,
                    failure: displayError
                }
            });
            Y.log("Sending request to load DB names", "info");
        }; /* EVENT LISTENERS */
    // Make a request to load Database names when the page loads
    Y.on("load", requestDBNames);
});