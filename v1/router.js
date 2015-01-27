var url = require("url"),
    output = require(__dirname + "/output.js"),
    api = require(__dirname + "/../api"),
    games = api.games,
	requestauth = api.requestauth,
    sections = {
        gamevars: require(__dirname + "/gamevars.js"),
        geoip: require(__dirname + "/geoip.js"),
        leaderboards: require(__dirname + "/leaderboards.js"),
        playerlevels: require(__dirname + "/playerlevels.js"),
		achievements: require(__dirname + "/achievements.js"),
		newsletter: require(__dirname + "/newsletter.js")
    };

module.exports = {

    /**
     * All of the api requests get routed through here
     * @param request
     * @param response
     * @param next
     * @param testcallback, used for tests only
     */
    router: function(request, response, next, testcallback) {

        //console.log("**** in router");

        // validate the game, it's set up so you can optionally
        // pass your public key in through the url which is easier
        // for testing
        var urlparams = url.parse(request.url, true);
        var publickey = urlparams.query.publickey;

        if(!publickey)  {
            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "Invalid request (router.js:41)");
        }

        var config = games.load(publickey);
		
        if(!config) {
            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "Invalid game (router.js:52)");
        }
		
        if(!request.body.data) {

            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "No posted data (router.js:61)");
        }

        //console.log("request.body.data: "+request.body.data);
        //console.log("request.body.hash: "+request.body.hash);
        //console.log("config.privatekey: "+config.privatekey);


        var decrypted = requestauth.validate(request.body.data, request.body.hash, config.privatekey);

        if(!decrypted) {

            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "Invalid posted data (router.js:72)");
        }
		
        var payload;

        try {
            payload = JSON.parse(decrypted);
        } catch(s) {

            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "Invalid JSON (router.js:85): " + s);
        }

        payload.ip = request.ip;
        payload.url = "https://" + request.headers.host + request.url;
		payload.publickey = request.query.publickey;
		
		if(urlparams.query.debug) {
            payload.debug = urlparams.query.debug;
		}

        // make sure the section is valid and allowed
        if(!payload.section || !sections.hasOwnProperty(payload.section)) {

            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "Invalid section '" + payload.section + "' (router.js:104)");
        }

        // make sure game or section hasn't been disabled
        if(!config[payload.section]) {
            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, sections[payload.section].sectionCode, "Section '" + payload.section + "' has been disabled for this game (router.js:113)");
        }

        if(!sections[payload.section] || !sections[payload.section][payload.action]) {
            if(testcallback) {
                testcallback(false);
            }

            return output.terminate(payload, response, 1, "Section '" + payload.section + "' or action '" + payload.action + "' is invalid (router.js:113)");
        }

        sections[payload.section][payload.action](payload, request, response, testcallback);
    }
};