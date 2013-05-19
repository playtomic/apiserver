var config = require(__dirname + "/config.js");

// setup
var mongodb = require("mongodb");
var collections = ["games", "gamevars", "leaderboard_scores", 
"leaderboard_tables", "leaderboard_bans", "playerlevel_levels", "playerlevel_bans",
 "achievements", "achievements_players"];

var db = new mongodb.Db(config.mongo.playtomic.name, new mongodb.Server(config.mongo.playtomic.address, config.mongo.playtomic.port, {slave_ok: true}));
db.open(function (error, cnn) {

    if(error) {
        console.log("connection failed: " + error);
        return;
    }
	
	function setup() {
		
		// create collections
		cnn.createCollection("games", {}, function(err, collection) {   });
		
		var i;
		var done = 0;
		var errors = 0;
		
		function jobdone(error) {
			done++;
			if(error) {
				errors++;
				console.log(error);
			}
				
			if(done == 24) {
				console.log("Setup finished with " + errors + " errors");
				cnn.close();
			}
		}
		
		for(i=0; i<collections.length; i++) {		
			cnn.createCollection(collections[i], {}, function(err, collection) {  done++; });
		}
		
		// create indexes
		cnn.collection("gamevars").createIndex([["publickey", 1], ["name", 1]], jobdone);
		cnn.collection("leaderboard_scores").createIndex([["publickey", 1], ["points", -1]], jobdone);
		cnn.collection("leaderboard_scores").createIndex([["publickey", 1], ["date", -1]], jobdone);
		cnn.collection("leaderboard_scores").createIndex([["publickey", 1], ["hash", 1]], jobdone);
		cnn.collection("leaderboard_bans").createIndex([["publickey", 1], ["hash", 1]], jobdone);
		cnn.collection("playerlevel_levels").createIndex([["publickey", 1], ["date", -1]], jobdone);
		cnn.collection("playerlevel_levels").createIndex([["publickey", 1], ["rating", -1]], jobdone);
		cnn.collection("playerlevel_levels").createIndex([["publickey", 1], ["hash", 1]], jobdone);
		cnn.collection("playerlevel_bans").createIndex([["publickey", 1], ["hash", 1]], jobdone);
		cnn.collection("achievements").createIndex([["publickey", 1], ["hash", 1]], jobdone);
		cnn.collection("achievements_players").createIndex([["publickey", 1], ["playerid", 1]], jobdone);
		
		// remove old testing data
		for(i = 0; i<collections.length; i++) {
			cnn.collection(collections[i]).remove({publickey: "testpublickey"}, jobdone);
		}
		
		// insert testing data
		cnn.collection("games").save({publickey: "testpublickey", privatekey: "testprivatekey" }, jobdone);
		cnn.collection("achievements").save({publickey: "testpublickey", achievement: "Super Mega Achievement #1", achievementkey: "secretkey" }, jobdone);
		cnn.collection("achievements").save({publickey: "testpublickey", achievement: "Super Mega Achievement #2", achievementkey: "secretkey2" }, jobdone);
		cnn.collection("achievements").save({publickey: "testpublickey", achievement: "Super Mega Achievement #3", achievementkey: "secretkey3" }, jobdone);
	}

    if(config.mongo.playtomic.username && config.mongo.playtomic.password) {
	    cnn.authenticate(config.mongo.playtomic.username, config.mongo.playtomic.password, function(error) {

	        if(error) {
	            console.log("authentication failed: " + error);
	            return;
	        }

	        setup();
	    });
	} else {
		setup();
	}
});

// configuration
var db = require(__dirname + "/mongo-wrapper.js");
db.poolEnabled = true;
db.poolSize = 20;
db.killEnabled = true;
db.setDatabases(config.mongo);
db.playtomic.collections(collections);

module.exports = db;