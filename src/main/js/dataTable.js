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

YUI.add('custom-datatable', function(Y) {
    Y.namespace('com.imaginea.mongoV');
    /**
     * <p>custom-datatable creates a datatable with the following columns
     * <p>Currently it is used to make the datatable to show the collection and the
     * database statistics. </p>
     *
     * @module custom-datatable
     * @namespace com.imaginea.mongov
     * @requires "io-base", "node", "json-parse", "datatable-scroll", "datasource-io", "datasource-jsonschema", "datatable-datasource", "event-delegate"
     * @param path
     *          <dd>(required) This is the url to which the request will be sent to get the data</dd>
     * @param name
     *          <dd>(required)The name of the collection/database whose data is required.</dd>
     */
    var MV = Y.com.imaginea.mongoV;
    MV.createDatatable = function(path, name) {
        MV.mainBody.set("innerHTML", "");
        /**
         * <p>The function is used to make the column configuration for the datatable  
         * @param colKey
         * <dd>(required)The column name</dd>
         **/
        var createColumn = function(colKey) {
            return {
                key: colKey,
                sortable: true,
                width: "210px"
            };
        };
        var cols = [createColumn("Key"), createColumn("Value"), createColumn("Type")];
        var ds = new Y.DataSource.IO({
            source: path
        });
        ds.plug(Y.Plugin.DataSourceJSONSchema, {
            schema: {
                resultListLocator: "response.result",
                resultFields: ["Key", "Value", "Type"]
            }
        });
        var dt = new Y.DataTable.Base({
            columnset: cols,
            width: "697px"
        }).plug(Y.Plugin.DataTableDataSource, {
            datasource: ds,
            initialRequest: ""
        });

        ds.after("response", function() {

            MV.header.addClass('tab-cont');
            MV.header.set("innerHTML", "Statistics: " + name);
            dt.render("#" + MV.mainBody.get('id'));
        });
    };
}, '3.3.0', {
    requires: ["io-base", "node", "json-parse", "datatable-scroll", "datasource-io", "datasource-jsonschema", "datatable-datasource", "event-delegate"]
});