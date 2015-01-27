

var testgame = module.exports = {
    publickey: "testpublickey",
    privatekey: "testprivatekey",
    leaderboards: true,
    gamevars: true,
    geoip: true,
    playerlevels: true,
    payload: {
        publickey: "testpublickey",
        ip: "62.163.200.241"
    },
    request: {
        ip: "62.163.200.241",
        url: "https://dragonsdodge.heroku.com/v1",

        headers: {
            "x-forwarded-for": "62.163.200.241"
        },
        connection: {
            remoteAddress: "62.163.200.241"
        }
    },
    response: {
        end: function(m) {
            return m;
        },
        writeHead: function(){
        }
    }
};

// make sure a fresh test game exists in the database
(function() {
    var db = require(__dirname + "/../api/database.js");
    db.Game.remove({publickey: testgame.publickey }, function() {
    	var game = {
    	    publickey: testgame.publickey, 
    	    privatekey: testgame.privatekey 
    	};
    	var ngame = new db.Game(game);
    	ngame.save(function(error) {
    	    if(error) {
    	        throw(error);
    	    }
    	});
    });
})();