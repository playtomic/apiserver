var db = require(__dirname + "/database.js"),
    gamelist = {};

var games = module.exports = {

    /**
     * Returns a game if it exists
     */
    load: function(publickey) {
        return gamelist[publickey] || null;
    },

    /**
     * Returns all the loaded data for testing
     */
    data: function(callback) {
        return gamelist;
    },

    ready: false
};

// test credentials
if(process.env.testing) {
    gamelist["testpublickey"] = {
        publickey: "testpublickey",
        privatekey: "testprivatekey",
        enabled: true,
        leaderboards: true,
        playerlevels: true,
        gamevars: true,
        geoip: true,
		achievements: true
    };

    games.ready = true;
};

// Data cache
(function() {
    var lastupdated = 0;

    function refresh() {

        db.playtomic.games.get({}, function(error, credentials)
        {
            if(error) {
                if(callback) {
                    callback(error);
                }

                console.log("GAMES failed to retrieve results from mongodb: " + error);
                return setTimeout(refresh, 1000);
            }
			
			var keys = ["enabled", "leaderboards", "playerlevels", "gamevars", "geoip", "achievements"];

            for(var i=0; i<credentials.length; i++) {
                var publickey = credentials[i].publickey;
                gamelist[publickey] = credentials[i];
				
				for(var j=0; j<keys.length; j++) {				
					if(!credentials[i].hasOwnProperty(keys[j])) {
						credentials[i][keys[j]] = true;
					}
				}
            }

            games.ready = true;
            return setTimeout(refresh, 30000);
        });
    }

    refresh();
})();