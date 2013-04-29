var api = require(__dirname + "/../api"),
    output = require(__dirname + "/output.js"),
    errorcodes = api.errorcodes,
	testing = process.env.testing || false;

module.exports = function(payload, request, response, testcallback) {

    api.leaderboards.saveAndList(payload, function(error, errorcode, numscores, scores) {

        if(error) {
            if(testcallback) {
                testcallback(error);
            }

            return output.terminate(payload, response, errorcode, error);
        }

        var r = output.end(payload, response, { scores: scores, numscores: numscores }, errorcode);
        // note: there is a non-fatal error for old scores not being overwritten, so we use ^ instead of NoError.

        if(testing && testcallback) {
            testcallback(null, r);
        }
    });
};