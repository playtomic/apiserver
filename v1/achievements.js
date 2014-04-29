var output = require(__dirname + "/output.js"),
    api = require(__dirname + "/../api"),
    testing = process.env.testing || false;

module.exports = {
	
	sectionCode: 500,

    list: function(payload, request, response, testcallback) {
		
        api.achievements.list(payload, function(error, errorcode, achievements) {
        
            if(error) {
                if(testcallback) {
                    testcallback(error);
                }
                
                return output.terminate(payload, response, errorcode, error);
            }
        
            var r = output.end(payload, response, { achievements: achievements}, errorcode);
        
            if(testing && testcallback) {
                testcallback(null, r);
            }
        });

    },

    stream: function(payload, request, response, testcallback) {
		
        api.achievements.stream(payload, function(error, errorcode, achievements, numachievements) {
        
            if(error) {
                if(testcallback) {
                    testcallback(error);
                }
        
                return output.terminate(payload, response, errorcode, error);
            }
        
            var r = output.end(payload, response, { achievements: achievements, numachievements: numachievements }, errorcode);
        
            if(testing && testcallback) {
                testcallback(null, r);
            }
        });
    },
	
	save: function(payload, request, response, testcallback) {

        api.achievements.save(payload, function(error, errorcode) {
        
            if(error) {
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
	}
};