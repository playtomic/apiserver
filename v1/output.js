var api = require(__dirname + "/../api"),
    datetime = api.datetime,
    errormessages = api.errormessages;

module.exports = {

    /**
     * Terminates a request with any error code or message
     * @param payload       The requested data
     * @param response      The http response object
     * @param errorcode     See errors.js in the API
     * @param exceptionmessage  Any exception or message
     * @return {*}
     */
    terminate: function(payload, response, errorcode, exceptionmessage) {

        // end the request
        var jstr = "{\"success\": false, \"errorcode\": " + errorcode + ", \"exceptionmessage\": \"" + exceptionmessage + "\"}";
        response.end(jstr);
        return jstr;
    },

    /**
     * Ends a request with data and its status
     * @param payload       The requested data
     * @param response      The http response object
     * @param responsedata  The requested data if applicable
     * @param errorcode     See errors.js in the API
     * @param exceptionmessage  Any exception or error message
     * @return {*}
     */
    end: function(payload, response, responsedata, errorcode, exceptionmessage) {

        if(errorcode == null) {
            errorcode = 0;
        }

        var json = responsedata;
        json.errorcode = errorcode;
        json.success = errorcode == 0 || !exceptionmessage; // not all error codes are fatal

        if(errorcode > 0) {
            json.errormessage = errormessages[errorcode] || "Unknown";
        }

        if(payload.debug) {
            json.debug = {
                utcnow: datetime.utcnow,
                url: payload.url,
                payload: JSON.stringify(payload)
            }
        }

        if(exceptionmessage) {
            json.exception = exceptionmessage;
        }

        // end the request
        var jstr = JSON.stringify(json);
        response.end(jstr);
        return jstr;
    }
};