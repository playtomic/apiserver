var testgame = require(__dirname + "/testgame.js"),
    games = require(__dirname + "/../api/games.js"),
    assert = require("assert");

describe("games", function() {
    
    var gvdata;
    var game;
    
    // wait for the games to load
    beforeEach(function(done) {
				
		// wait for db setup to complete
		function dbready() {
			
			if(!db.ready) {
				return setTimeout(dbready, 100);
			}
			
	        function gamesready() {
            
	            if(!games.ready) {
	                return setTimeout(gamesready, 100);
	            }

	            gvdata = games.data();
	            game = gvdata[testgame.publickey];
	            done();
	        }
        
	        gamesready();
		}
		
		dbready();
    });
     
    it("Games load correctly", function() {
        assert.notEqual(gvdata, null);
        assert.notEqual(gvdata[testgame.publickey], null);
        assert.notEqual(game, null);
        assert.equal(gvdata[testgame.publickey], game);
    });
    
    it("Single game's data loads correctly", function() {
        assert.equal(game.publickey, testgame.publickey);
        assert.equal(game.privatekey, testgame.privatekey);
        assert.equal(game.enabled, true);
        assert.equal(game.playerlevels, true);
        assert.equal(game.leaderboards, true);
        assert.equal(game.geoip, true);
        assert.equal(game.gamevars, true);
    });
    
    it("Loading by API call", function() {
        var agame = games.load(testgame.publickey);
        assert.notEqual(agame, null);
        assert.equal(agame.publickey, testgame.publickey);
        assert.equal(agame.privatekey, testgame.privatekey);
        assert.equal(agame.enabled, true);
        assert.equal(agame.playerlevels, true);
        assert.equal(agame.leaderboards, true);
        assert.equal(agame.geoip, true);
        assert.equal(agame.gamevars, true);
    });

    it("Testing invalid information", function() {

        function fakeid() {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for( var i=0; i < 50; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        assert.equal(games.load(), null);
        assert.notEqual(games.load(testgame.publickey), null);
        assert.equal(games.load(fakeid()), null);
        assert.equal(games.load(Math.round(100000000 * Math.random())), null);
        assert.equal(games.load(Math.random()), null);
    });
});
