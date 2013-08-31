var mongodb = require("mongodb"),
    mdouble = mongodb.BSONPure.Double,
    games = require(__dirname + "/games.js"),
    config = require(__dirname + "/config.js"),
    db = require(__dirname + "/database.js"),
    varlist = {};

var gamevars = module.exports = {

    // for tests
    ready: false,
    data: varlist,

    /**
     * Loads the GameVars for a game
     * @param publickey
     */
    load: function(publickey) {
        return varlist[publickey] || {};
    }
};

// Data cache
(function() {
    var lastupdated = 0;

    function refresh() {

        if(!games.ready) {
            return setTimeout(refresh, 1000);
        }

        db.playtomic.gamevars.get(function(error, vars)
        {
            if(error) {
                if(callback) {
                    callback(error);
                }

                console.log("GAMEVARS failed to retrieve results from mongodb: " + error);
                return setTimeout(refresh, 1000);
            }

            for(var i=0; i<vars.length; i++) {
				
		var publickey = vars[i].publickey;
		
		if(!publickey) {
			console.log("GAMEVARS warning you have gamevars configured that don't have a publickey");
			continue;
		}

                var gamevar = vars[i];

                if(!varlist[publickey]) {
                    varlist[publickey] = {};
                }

                if(vars[i].lastupdated > lastupdated) {
                    lastupdated = vars[i].lastupdated;
                }

                varlist[publickey][gamevar.name] = gamevar;
            }

            gamevars.ready = true;
            return setTimeout(refresh, 30000);
        });
    }

    refresh();
})();