var output = require(__dirname + "/output.js"),
    api = require(__dirname + "/../api"),
    errorcodes = api.errorcodes,
	testing = process.env.testing || false;

module.exports = {
	
	sectionCode: 600,
    
    subscribe: function(payload, request, response, testcallback) {

        api.newsletter.subscribe(payload, function(error, errorcode) {
			
			if(error) {
			
	            if(testcallback) {
	                testcallback(error);
	            }

	            return output.terminate(payload, response, errorcode, error);
			}
			
	        var r = output.end(payload, response, {}, errorcodes.NoError);

	        if(testing && testcallback) {
	            testcallback(null, r);
	        }
        });
     }
};