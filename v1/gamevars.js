var output = require(__dirname + "/output.js"),
    api = require(__dirname + "/../api"),
    errorcodes = api.errorcodes,
	testing = process.env.testing || false;

module.exports = {
	
	sectionCode: 300,

    load: function(payload, request, response, testcallback) {
        var gv = api.gamevars.load(payload.publickey);
        var r = output.end(payload, response, gv, errorcodes.NoError);

        if(testcallback) {
            testcallback(null, r);
        }
    },

    single: function(payload, request, response, testcallback) {

        var gv = api.gamevars.load(payload.publickey);

        var single = {};
        single[payload.name] = gv[payload.name];

        var r = output.end(payload, response, single, errorcodes.NoError);

        if(testing && testcallback) {
            testcallback(null, r);
        }
    }
};