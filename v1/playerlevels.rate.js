var api = require(__dirname + "/../api"),
    output = require(__dirname + "/output.js"),
    utils = api.utils,
    toInt = utils.toInt,
    date = utils.fromTimestamp,
    fdate = utils.friendlyDate,
    average = utils.average,
    errorcodes = api.errorcodes,
	testing = process.env.testing || false;

module.exports = function(payload, request, response, testcallback) {

    api.playerlevels.rate(payload, function(error, errorcode) {

        if(error) {
            if(testcallback) {
                testcallback(error);
            }

            return output.terminate(payload, response, errorcode, error);
        }

        if(errorcode > 0) {
            if(testcallback) {
                testcallback(error);
            }

            return output.terminate(payload, response, errorcode, error);
        }

        var r = output.end(payload, response, {}, errorcode);

        if(testing && testcallback) {
            testcallback(null, r);
        }
    });
};
