var api = require(__dirname + "/../api"),
    output = require(__dirname + "/output.js"),
    utils = api.utils,
    toInt = utils.toInt,
    date = utils.fromTimestamp,
    fdate = utils.friendlyDate,
    average = utils.average,
    errorcodes = api.errorcodes,
    datetime = api.datetime,
	testing = process.env.testing || false;

module.exports = function(payload, request, response, testcallback) {

    api.playerlevels.load(payload, function(error, errorcode, level) {

        if(error) {
            if(testcallback) {
                testcallback(error);
            }

            return output.terminate(payload, response, errorcode, error);
        }

        var r = output.end(payload, response, {level: level}, errorcodes.NoError);

        if(testing && testcallback) {
            testcallback(null, r);
        }
    });
};