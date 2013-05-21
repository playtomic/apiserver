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
		
		var jobs = [],
			collectionadd = 0,
			collectionclean = 0;
		
		// creating collections
		collections.forEach(function(collection) {
			jobs.push(function() { 
				cnn.createCollection(collection, {}, next);
			});
		});	
		
		// create indexes
		jobs.push(function() { 
			cnn.collection("gamevars").createIndex([["publickey", 1], ["name", 1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("leaderboard_scores").createIndex([["publickey", 1], ["points", -1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("leaderboard_scores").createIndex([["publickey", 1], ["date", -1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("leaderboard_scores").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("leaderboard_bans").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("playerlevel_levels").createIndex([["publickey", 1], ["date", -1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("playerlevel_levels").createIndex([["publickey", 1], ["rating", -1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("playerlevel_levels").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("playerlevel_bans").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("achievements").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			cnn.collection("achievements_players").createIndex([["publickey", 1], ["playerid", 1]], next); 
		});
		
		// remove old testing data
		collections.forEach(function(collection) {
			jobs.push(function() { 
				cnn.collection(collection).remove({publickey: "testpublickey"}, next);
			});
		});
		
		// insert testing data
		jobs.push(function() { 
			cnn.collection("games").save({publickey: "testpublickey", privatekey: "testprivatekey" }, next); 
		});
		jobs.push(function() { 
			cnn.collection("achievements").save({publickey: "testpublickey", achievement: "Super Mega Achievement #1", achievementkey: "secretkey" }, next); 
		});
		jobs.push(function() { 
			cnn.collection("achievements").save({publickey: "testpublickey", achievement: "Super Mega Achievement #2", achievementkey: "secretkey2" }, next); 
		});
		jobs.push(function() { 
			cnn.collection("achievements").save({publickey: "testpublickey", achievement: "Super Mega Achievement #3", achievementkey: "secretkey3" }, next); 
		});
		jobs.push(function() { 
			cnn.collection("gamevars").save({publickey: "testpublickey", name: "testvar1", value: "testvalue1" }, next); 
		});
		jobs.push(function() { 
			cnn.collection("gamevars").save({publickey: "testpublickey", name: "testvar2", value: "testvalue2" }, next); 
		});
		jobs.push(function() { 
			cnn.collection("gamevars").save({publickey: "testpublickey", name: "testvar3", value: "testvalue3 and the final gamevar" }, next); 
		});
		
	    var scores = [
			{playername: "alicia", playerid: 1, points: 21000},
			{playername: "fred", playerid: 2, points: 22000}, 
			{playername: "harry", playerid: 3, points: 23000},
			{playername: "jules", playerid: 4, points: 24000},
			{playername: "michael", playerid: 5, points: 25000},
			{playername: "michelle", playerid: 6, points: 26000},
			{playername: "paul", playerid: 7, points: 27000},
			{playername: "peter", playerid: 8, points: 28000},
			{playername: "robert", playerid: 9, points: 29000},
			{playername: "sally", playerid: 10, points: 30000}
		];
		
		scores.forEach(function(scoredata) {
			jobs.push(function() { 
				
		        var score = {
		            publickey: "testpublickey",
		            source: "localhost",
					playername: scoredata.playername,
		            points: scoredata.points,
		            playerid: scoredata.playerid.toString(),
					table: "scores",
		            fields: {}
		        };
				
				cnn.collection("leaderboard_scores").save(score, next); 
			});
		});


		function next(error) {
			
			if(error) {
				console.log(error);
			}
			
			if(jobs.length == 0) {
				db.ready = true;
				cnn.close();
			} else { 
				jobs.shift()();
			}
		}
		
		next();
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
db.ready = false;

module.exports = db;