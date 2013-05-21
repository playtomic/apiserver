var output = require(__dirname + "/output.js"),
    api = require(__dirname + "/../api"),
    errorcodes = api.errorcodes,
	testing = process.env.testing || false;

module.exports = {
	
	sectionCode: 100,
    
    lookup: function(payload, request, response, testcallback) {

        var country = api.geoip.lookup(payload.ip);

        if(country.error) {

            if(testcallback) {
                testcallback(country.error);
            }

            return output.terminate(payload, response, 1, country.error);
        }

        var r = output.end(payload, response, country, errorcodes.NoError);

        if(testing && testcallback) {
            testcallback(null, r);
        }
     }
};