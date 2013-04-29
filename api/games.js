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
        geoip: true
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

            for(var i=0; i<credentials.length; i++) {
                var publickey = credentials[i].publickey;
                gamelist[publickey] = credentials[i];
            }

            ready = true;
            return setTimeout(refresh, 30000);
        });
    }

    refresh();
})();