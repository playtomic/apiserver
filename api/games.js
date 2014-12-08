var db = require(__dirname + "/database.js"),
    datetime = require(__dirname + "/datetime.js"),
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
}

// Data cache
(function(lastupdated) {

    function refresh() {

        var filter = {$or: [{lastupdated: {$gte: lastupdated}}, {lastupdated: {$exists: false}}]};
        db.Game.find(filter).exec(function(error, games)
        {
            if(error) {
                console.log("GAMES failed to retrieve results from mongodb: " + error);
                return setTimeout(refresh, 1000);
            }
			
			var keys = ["enabled", "leaderboards", "playerlevels", "gamevars", "geoip", "achievements", "newsletter"];
			
			games.forEach(function(gd) {
			   
                if(!gd.lastupdated) {
                    db.Game.update({_id: gd._id}, { lastupdated: datetime.now });
                } else if(gd.lastupdated > lastupdated) {
                    lastupdated = gd.lastupdated;
                }
                
                var game = gd.toObject();
			    gamelist[game.publickey] = game;
			    
			    keys.forEach(function(key) {
			        game[key] = game[key] !== false;
			    });
			});

            games.ready = true;
            return setTimeout(refresh, 30000);
        });
    }

    refresh();
})(0);