/*
 * Copyright (c) 2011 Imaginea Technologies Private Ltd.
 * Hyderabad, India
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
YUI({
    filter: 'raw'
}).use("loading-panel","yes-no-dialog", "alert-dialog", "io-base", "json-parse", "node-event-simulate", "node", "event-delegate", "stylize", "json-stringify", "utility", "treeble-paginator", "event-key", "event-focus", "node-focusmanager", function(Y) {
    YUI.namespace('com.imaginea.mongoV');
    var MV = YUI.com.imaginea.mongoV,
        sm = MV.StateManager;
    MV.treebleData = {};

    /**
     * The function is an event handler to show the documents whenever a column name is clicked  
     * @param {object} e It is an event object
     *
     */
    var showTabView = function(e) {
        Y.one("#currentColl").set("value", e.currentTarget.getAttribute("label"));
	    MV.toggleClass(e.currentTarget, Y.all("#collNames li"));
	    MV.toggleClass(e.currentTarget, Y.all("#bucketNames li"));
        MV.mainBody.empty(true);
	    MV.deleteDocEvent.unsubscribeAll();
	    MV.deleteDocEvent.subscribe(deleteDoc);

	    var tabView = new YAHOO.widget.TabView();
	    tabView.addTab(new YAHOO.widget.Tab({
		    label: 'JSON',
		    cacheData: true,
		    active: true
	    }));
	    tabView.addTab(new YAHOO.widget.Tab({
		    label: 'Tree Table',
		    content: ' <div id="table"></div><div id="table-pagination"></div> '
	    }));
	    var actionMap = {
		    save: "save",
		    edit: "edit"
	    };

	    var idMap = {};

	    /**
	     * It sends request to get all  the keys of the  current collection
	     */
	    var getKeyRequest = Y.io(MV.URLMap.documentKeys(), {
		    method: "GET",
		    on: {
			    success: showQueryBox,
			    failure: function(ioId, responseObject) {
				    MV.hideLoadingPanel();
				    MV.showAlertMessage("Unexpected Error: Could not load the query Box", MV.warnIcon);
				    Y.log("Could not send the request to get the keys in the collection. Response Status: [0]".format(responseObject.statusText), "error");

			    }
		    }
	    });

        /**
         *The function is success handler for the request of getting all the keys in a collections.
         *It parses the response, gets the keys and makes the query box. It also sends the request to load the
         *documents after the query box has been populated,
         * @param {Number} e Id
         * @param {Object} The response Object
         */

        function showQueryBox(ioId, responseObject) {
            var parsedResponse, keys, count, queryForm, error;
            Y.log("Preparing to show QueryBox", "info");
            try {
                Y.log("Parsing the JSON response to get the keys", "info");
                parsedResponse = Y.JSON.parse(responseObject.responseText);
                keys = parsedResponse.response.result.keys;
	            count = parsedResponse.response.result.count;
                if (keys !== undefined) {
	                document.getElementById('queryExecutor').style.display = 'block';
                    queryForm = Y.one('#queryForm');
                    queryForm.addClass('form-cont');
                    queryForm.set("innerHTML", MV.getForm(keys, count));
                    // insert a ctrl + enter listener for query evaluation
                    Y.one("#queryBox").on("keyup", function(eventObject) {
                        if (eventObject.ctrlKey && eventObject.keyCode === 13) {
                            Y.one('#execQueryButton').simulate('click');
                        }
                    });
                    Y.log("QueryBox loaded", "info");
                    //TODO instead of assigning it every time delegate it
                    Y.on("click", executeQuery, "#execQueryButton");
	                Y.on("click", handleSelect, "#selectAll");
	                Y.on("click", handleSelect, "#unselectAll");
	                Y.on("click", handlePagination, "#first");
	                Y.on("click", handlePagination, "#prev");
	                Y.on("click", handlePagination, "#next");
	                Y.on("click", handlePagination, "#last");
	                defineDatasource();
                    requestDocuments(getQueryParameters());
	                updateAnchors(count);
                } else {
                    error = parsedResponse.response.error;
                    Y.log("Could not get keys. Message: [0]".format(error.message), "error");
                    MV.showAlertMessage("Could not load the query Box! [0]".format(MV.errorCodeMap(error.code)), MV.warnIcon);
                }
            } catch (e) {
                Y.log("Could not parse the JSON response to get the keys", "error");
                Y.log("Response received: [0]".format(responseObject.resposeText), "error");
                MV.showAlertMessage("Cannot parse Response to get keys!", MV.warnIcon);
            }
        }

	    /**
	     *The function is an event handler for the execute query button. It gets the query parameters
	     *and sends a request to get the documents
	     * @param {Object} event The event object
	     */
	    function executeQuery(event) {
		    var queryParams = getQueryParameters();
		    if (queryParams !== undefined) {
			    requestDocuments(queryParams);
		    }
	    }

	    function handleSelect(event) {
		    var id = event.currentTarget.get("id");
		    var elements = Y.Selector.query('ul[id=fields] input');
		    if (id === "selectAll") {
			    Y.Array.each(elements, function(element) {
				    element.checked = true;
			    });
		    } else {
			    Y.Array.each(elements, function(element) {
				    element.checked = false;
			    });
		    }
	    }

	    function handlePagination(event) {
		    var href = event.currentTarget.get("href");
		    if (href == null || href == undefined || href == "")
			    return;
		    var id = event.currentTarget.get("id");
		    var skip = Y.one('#skip'), limit = Y.one('#limit'), count = Y.one('#countLabel');
		    var skipValue = parseInt(skip.get('value')), limitValue = parseInt(limit.get('value')), countValue = parseInt(count.get('text'));
		    if (id === "first") {
			    skip.set('value', 0);
		    } else if (id === "prev") {
			    skip.set('value', (skipValue - limitValue) < 0 ? 0 : (skipValue - limitValue));
		    } else if (id === "next") {
			    skip.set('value', skipValue + limitValue);
		    } else if (id === "last") {
			    skip.set('value', countValue - limitValue);
		    }
		    Y.one('#execQueryButton').simulate('click');
		    updateAnchors(countValue);
	    }

	    function updateAnchors(count) {
		    var first = Y.one('#first'), prev = Y.one('#prev'), next = Y.one('#next'), last = Y.one('#last');
		    var start = Y.one('#startLabel'), end = Y.one('#endLabel'), countLabel = Y.one('#countLabel');
		    var skip = parseInt(Y.one('#skip').get('value')), limit = parseInt(Y.one('#limit').get('value'));
		    if (skip == 0) disableAnchor(first);
		    else enableAnchor(first);
		    if (skip + limit <= limit) disableAnchor(prev);
		    else enableAnchor(prev);
		    if (skip >= count - limit) disableAnchor(next);
		    else enableAnchor(next);
		    if (skip + limit >= count) disableAnchor(last);
		    else enableAnchor(last);
		    start.set('text', count != 0 ? skip + 1 : 0);
		    end.set('text', count < skip + limit ? count : skip + limit);
		    countLabel.set('text', count);

	    }

	    function enableAnchor(obj) {
		    obj.setAttribute('href', 'javascript:void(0)');
		    obj.setStyle('color', '#39C');
	    }

	    function disableAnchor(obj) {
		    obj.removeAttribute('href');
		    obj.setStyle('color', 'grey');
	    }

        /**
         * The function creates and XHR data source which will get all the documents.
         * A data source is created so that we don't have to send separate requests to load
         * the JSON view and the Treeble view
         *
         */

        function defineDatasource() {
            MV.getDocsRequest = new YAHOO.util.XHRDataSource(MV.URLMap.getDocs(), {
                responseType: YAHOO.util.XHRDataSource.TYPE_JSON,
                responseSchema: {
                    resultsList: "response.result"
                }
            });
        }

        /**
         * This function gets the query parameters from the query box. It takes the
         * query string, the limit value, skip value and the fields selected and return a
         * query parameter string which will be added to the request URL
         * @returns {String} Query prameter string
         *
         */
        function getQueryParameters() {
            var parsedQuery, query = Y.one('#queryBox').get("value"),
                limit = Y.one('#limit').get("value"),
                skip = Y.one('#skip').get("value"),
                fields = Y.all('#fields input'),
                index = 0,
                checkedFields = [],
                item;

            if (query.trim() === "") {
                query = "{}";
            }

            //replace the single quotes (') in the query string by double quotes (")
            query = query.replace(/'/g, '"');

            try {
                parsedQuery = Y.JSON.parse(query);
                for (index = 0; index < fields.size(); index++) {
                    item = fields.item(index);
                    if (item.get("checked")) {
                        checkedFields.push(item.get("name"));
                    }
                }
                return ("&limit=[0]&skip=[1]&fields=[2]&query=[3]".format(limit, skip, checkedFields, query));
            } catch (error) {
                Y.log("Could not parse query. Reason: [0]".format(error), "error");
                MV.showAlertMessage("Failed:Could not parse query. [0]".format(error), MV.warnIcon);
            }
        }

        /**
         * The function sends a request to the data source create by function <tt>defineDatasource</tt>
         * to get all the documents.
         * @param {String} param The query parameter string that has to be sent to get the documents
         */
        function requestDocuments(param) {
        	MV.showLoadingPanel("Loading Documents...")
            MV.getDocsRequest.sendRequest(param, {
                success: showDocuments,
                failure: function(request, responseObject) {
                	 MV.hideLoadingPanel();
                    MV.showAlertMessage("Failed: Documents could not be loaded", MV.warnIcon);
                    Y.log("Documents could not be loaded. Response: [0]".format(responseObject.responseText), "error");
                },
                scope: tabView
            });
        }

        function showDocuments(request, responseObject) {
	        try {
		        Y.log("Preparing the treeTable data", "info");
		        var treebleData = MV.getTreebleDataForDocs(responseObject.results[0]);
		        var treeble = MV.getTreeble(treebleData, "document");
		        // Remove download column for document operations
		        treeble.removeColumn(treeble.getColumn("download_column"));
		        loadAndSubscribe(treeble);
		        Y.log("Tree table view loaded", "info");
		        Y.log("Preparing to write on JSON tab", "info");
		        writeOnJSONTab(responseObject.results[0].documents);
		        updateAnchors(responseObject.results[0].count);
		        sm.publish(sm.events.queryFired);
		        MV.hideLoadingPanel();
	        } catch(error) {
		        Y.log("Failed to initailise data tabs. Reason: [0]".format(error), "error");
		        MV.showAlertMessage("Failed to initailise data tabs. [0]".format(error), MV.warnIcon);
	        }
        }

        /**
         * The function creates the json view and adds the edit,delete,save and cancel buttons for each document
         * @param response The response Object containing all the documents
         */
        function writeOnJSONTab(response) {
            var jsonView = "<div class='buffer jsonBuffer navigable navigateTable' id='jsonBuffer'>";
            var i;
            var trTemplate = ["<tr id='doc[0]'>",
                                              "  <td>",
                                              "      <pre> <textarea id='ta[1]' class='disabled non-navigable' disabled='disabled' cols='74'>[2]</textarea></pre>",
                                              "  </td>",
                                              "  <td>",
                                              "  <button id='edit[3]'class='bttn editbtn non-navigable'>edit</button>",
                                              "   <button id='delete[4]'class='bttn deletebtn non-navigable'>delete</button>",
                                              "   <button id='save[5]'class='bttn savebtn non-navigable invisible'>save</button>",
                                              "   <button id='cancel[6]'class='bttn cancelbtn non-navigable invisible'>cancel</button>",
                                              "   <br/>",
                                              "  </td>",
                                              "</tr>"].join('\n');
            jsonView += "<table class='jsonTable'><tbody>";	        

            for (i = 0; i < response.length; i++) {
                jsonView += trTemplate.format(i, i, Y.JSON.stringify(response[i], null, 4), i, i, i, i);
            }
            if (i === 0) {
                jsonView = jsonView + "No documents to be displayed";
            }
            jsonView = jsonView + "</tbody></table></div>";
            tabView.getTab(0).setAttributes({
                content: jsonView
            }, false);
            for (i = 0; i < response.length; i++) {
                Y.on("click", editDoc, "#edit" + i);
                Y.on("click", function(e) {
					MV.deleteDocEvent.fire({eventObj : e});
				}, "#delete" + i);
                Y.on("click", saveDoc, "#save" + i);
                Y.on("click", cancelSave, "#cancel" + i);
            }
            for (i = 0; i < response.length; i++) {
                fitToContent(500, document.getElementById("ta" + i));
            }
            var trSelectionClass = 'selected';
            // add click listener to select and deselect rows.
            Y.all('.jsonTable tr').on("click", function(eventObject) {
                var currentTR = eventObject.currentTarget;
                var alreadySelected = currentTR.hasClass(trSelectionClass);

                Y.all('.jsonTable tr').each(function(item) {
                    item.removeClass(trSelectionClass);
                });

                if (!alreadySelected) {
                    currentTR.addClass(trSelectionClass);
                    var editBtn = currentTR.one('button.editbtn');
                    if (editBtn) {
                        editBtn.focus();
                    }
                }
            });
            Y.on('blur', function(eventObject) {
                var resetAll = true;
                // FIXME ugly hack for avoiding blur when scroll happens
                if (sm.isNavigationSideEffect()) {
                    resetAll = false;
                }
                if (resetAll) {
                    Y.all('tr.selected').each(function(item) {
                        item.removeClass(trSelectionClass);
                    });
                }
            }, 'div.jsonBuffer');

            Y.on('keyup', function(eventObject) {
                var firstItem;
                // escape edit mode
                if (eventObject.keyCode === 27) {
                    Y.all("button.savebtn").each(function(item) {
                        toggleSaveEdit(item, getButtonIndex(item), actionMap.save);
                        if (!(firstItem)) {
                            firstItem = item;
                        }
                    });
                }
            }, 'div.jsonBuffer');
            Y.log("The documents written on the JSON tab", "debug");
        }

        /**
         * Sets the size of the text area according to the content in the text area.
         * @param maxHeight The maximum height if the text area
         * @param text The text of the text area
         */

        function fitToContent(maxHeight, text) {
            if (text) {
                var adjustedHeight = text.clientHeight;
                if (!maxHeight || maxHeight > adjustedHeight) {
	                adjustedHeight = Math.max(text.scrollHeight, adjustedHeight) + 4;
                    if (maxHeight) {
                        adjustedHeight = Math.min(maxHeight, adjustedHeight);
                    }
                    if (adjustedHeight > text.clientHeight) {
                        text.style.height = adjustedHeight + "px";
                    }
                }
            }
        }

        /**
         * The function loads the treeble view and subscibes it to the mouse over event.
         * When the mouse over over the rows the complete row is highlighted
         * @param treeble the treeble structure to be loaded
         */
        function loadAndSubscribe(treeble) {
            treeble.load();
            treeble.subscribe("rowMouseoverEvent", treeble.onEventHighlightRow);
            treeble.subscribe("rowMouseoutEvent", treeble.onEventUnhighlightRow);
        }

        /**
         * The function is the success handler for the request document call.
         * It calls function to write on the JSON tab and to create the treeble structure
         * from the response data
         * @param {Object} request The request Object
         * @param {Object} responseObject The response object containing the response of the get documents request
         *
         */
        function getButtonIndex(targetNode) {
            var btnID = targetNode.get("id");
            var match = btnID.match(/\d+/);
            return (parseInt(match[0], 10));
        }

        /**
         * The function toggles the save/cancel and edit/delete buttons. It just adds/removes class invisible.
         * Also it makes the textArea disabled/enabled based on the condition
         * @param targetNode The dom element on which is clicked
         * @param index the index number of the node that is clicked
         * @param action The action (save/edit) that has been performed
         */
        function toggleSaveEdit(targetNode, index, action) {
            var textArea = Y.one('#doc' + index).one("pre").one("textarea");
            if (action === actionMap.save) {
                textArea.addClass('disabled');
                textArea.setAttribute("disabled", "disabled");
                Y.one("#save" + index).addClass("invisible");
                Y.one("#cancel" + index).addClass("invisible");
                Y.one("#edit" + index).removeClass("invisible");
                Y.one("#delete" + index).removeClass("invisible");
            } else {
                textArea.removeAttribute("disabled");
                textArea.removeClass('disabled');
                Y.one("#edit" + index).addClass("invisible");
                Y.one("#delete" + index).addClass("invisible");
                Y.one("#save" + index).removeClass("invisible");
                Y.one("#cancel" + index).removeClass("invisible");
            }
            targetNode.focus();
        }

        /**
         * The function sends the update Document request.
         * @param doc The updated document
         * @param docId The id of the updated document
         */
        function sendUpdateDocRequest(doc, docId, eventObject) {
            var updateDocumentRequest = Y.io(MV.URLMap.updateDoc(), {
                method: "POST",
                data: "_id=" + docId + "&keys=" + doc,
                on: {
                    success: function(ioId, responseObject) {
	                    var parsedResponse = Y.JSON.parse(responseObject.responseText);
	                    var response = parsedResponse.response.result;
	                    if (response !== undefined) {
		                    var targetNode = eventObject.currentTarget;
		                    var index = getButtonIndex(targetNode);
		                    toggleSaveEdit(targetNode, index, actionMap.save);
		                    MV.showAlertMessage("Document updated successfully.", MV.infoIcon);
		                    Y.log("Document update to [0]".format(response), "info");
	                    } else {
		                    var error = parsedResponse.response.error;
		                    MV.showAlertMessage("Could not update Document ! [0]", MV.warnIcon, error.code);
		                    Y.log("Could not update Document ! [0]".format(MV.errorCodeMap[error.code]), "error");
	                    }
                    },
                    failure: function(ioId, responseObject) {
                        MV.showAlertMessage("Unexpected Error: Could not update the document. Check if app server is running", MV.warnIcon);
                        Y.log("Could not send the request to update the document. Response Status: [0]".format(responseObject.statusText), "error");
                    }
                }
            });
        }

        /**
         * The function checks of all keys are selected in the fields list of the query box
         */

        function allKeysSelected() {
            var fields = Y.all('#fields input');
            var index;
            for (index = 0; index < fields.size(); index++) {
                var item = fields.item(index);
                if (!item.get("checked")) {
                    return false;
                }
            }
            return true;
        }
        /**
         * The function marks all the keys in the query box as checkd
         */

        function selectAllKeys() {
            var fields = Y.all('#fields input');
            var index;
            for (index = 0; index < fields.size(); index++) {
                var item = fields.item(index);
                item.set("checked", "true");
            }
            executeQuery();
            this.hide();
        }
        /**
         * The function is an event handler to handle the delete button click.
         * It sends request to delete the document
         * @param eventObject The event Object
         */

        function deleteDoc(type, args) {
            var btnIndex;
            var sendDeleteDocRequest = function() {
                var targetNode = args[0].eventObj.currentTarget;
                var index = getButtonIndex(targetNode);
                var doc = Y.one('#doc' + index).one("pre").one("textarea").get("value");
                var parsedDoc = Y.JSON.parse(doc);
	            var docId = Y.JSON.stringify(parsedDoc._id);
                var request = Y.io(MV.URLMap.deleteDoc(),
                // configuration for dropping the document
                {
                    method: "POST",
                    data: "_id=" + docId,
                    on: {
                        success: function(ioId, responseObj) {
                            var parsedResponse = Y.JSON.parse(responseObj.responseText);
                            response = parsedResponse.response.result;
                            if (response !== undefined) {
                                MV.showAlertMessage("Document deleted successfully.", MV.infoIcon);
                                Y.log("Document with _id= [0] deleted. Response: [1]".format(docId, response), "info");
                                Y.one('#execQueryButton').simulate('click');
                            } else {
                                var error = parsedResponse.response.error;
                                MV.showAlertMessage("Could not delete the document with _id [0]. [1]".format(docId, MV.errorCodeMap[error.code]), MV.warnIcon);
                                Y.log("Could not delete the document with _id =  [0], Error message: [1], Error Code: [2]".format(docId, error.message, error.code), "error");
                            }
                        },
                        failure: function(ioId, responseObj) {
                            Y.log("Could not delete the document .Status text: ".format(Y.one("#currentColl").get("value"), responseObj.statusText), "error");
                            MV.showAlertMessage("Could not drop the document! Please check if your app server is running and try again. Status Text: [1]".format(responseObj.statusText), MV.warnIcon);
                        }
                    }
                });
                this.hide();
            };
            if (args[0].eventObj.currentTarget.hasClass('deletebtn') || args[0].eventObj.currentTarget.hasClass('delete-icon')) {
                MV.showYesNoDialog("Do you really want to drop the document ?", sendDeleteDocRequest, function() {
                    this.hide();
                });
            } else {
                //get the sibling save/edit bttn and toggle using that
                btnIndex = getButtonIndex(args[0].eventObj.currentTarget);
                toggleSaveEdit(Y.one('#delete' + btnIndex).get('parentNode').one('button'), btnIndex, actionMap.save);
            }
        }
        /**
         * The function is an event handler for the save button click.
         * @param eventObject The event Object
         */

        function saveDoc(eventObject) {
            var targetNode = eventObject.currentTarget;
            var index = getButtonIndex(targetNode);
            var textArea = Y.one('#doc' + index).one("pre").one("textarea");
            var doc = textArea.get("value");
            doc = doc.replace(/'/g, '"');
            try {
                var parsedDoc = Y.JSON.parse(doc);
                sendUpdateDocRequest(Y.JSON.stringify(parsedDoc), idMap[index].docId, eventObject);
            } catch (e) {
                MV.showAlertMessage("The document entered is not in the correct JSON format", MV.warnIcon);
	            textArea.focus();
            }
        }
        /**
         * The function is an event handler for the cancel button click
         * @param eventObject The event Object
         */

        function cancelSave(eventObject) {
            var targetNode = eventObject.currentTarget;
            var index = getButtonIndex(targetNode);
            var textArea = Y.one('#doc' + index).one("pre").one("textarea");
            textArea.set("value", idMap[index].originalDoc);
            toggleSaveEdit(targetNode, index, actionMap.save);
        }
        /**
         * The function is an event handler for the edit button click
         * @param eventObject The event Object
         */

        function editDoc(eventObject) {
            if (!allKeysSelected()) {
                MV.showYesNoDialog("To edit a document you need check all keys in query box. Click YES to do so, NO to cancel", selectAllKeys, function() {
                    this.hide();
                });
            } else {
                var targetNode = eventObject.currentTarget;
                var index = getButtonIndex(targetNode);
                var textArea = Y.one('#doc' + index).one("pre").one("textarea");
                var doc = textArea.get("value");
                var parsedDoc = Y.JSON.parse(doc);
	            var docId = Y.JSON.stringify(parsedDoc._id);
                idMap[index] = {};
                idMap[index].docId = docId;
                idMap[index].originalDoc = doc;
                toggleSaveEdit(targetNode, index, actionMap.edit);
                textArea.focus();
            }
        }

        MV.header.set("innerHTML", "Contents of Collection : " + Y.one("#currentColl").get("value"));
        tabView.appendTo(MV.mainBody.get('id'));
    };
    Y.delegate("click", showTabView, "#collNames", "a.collectionLabel");
});