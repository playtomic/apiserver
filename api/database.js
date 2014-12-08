var mongoose = require("mongoose"),
	mongodb = require("mongodb"),
	config = require(__dirname + "/config.js"),
	datetime = require(__dirname + "/datetime.js");
    
mongoose.plugin(function (schema) {
	schema.options.safe = {
		w: 1
	};
	schema.options.strict = true;
});
    
mongoose.connect(config.mongodb.playtomic);

var gameMap = {
    publickey: String,
    privatekey: String,
    enabled: Boolean,
    leaderboards: Boolean,
    playerlevels: Boolean,
    gamevars: Boolean,
    geoip: Boolean,
	achievements: Boolean,
	lastupdated: { type: Number, default: datetime.now }
};

var gamevarMap = {
	publickey: String,
	name: String,
	value: mongoose.Schema.Types.Mixed,
	lastupdated: { type: Number, default: datetime.now }
};

var leaderboardScoreMap = {
	publickey: String,
	source: String,
	playername: String,
	playerid: String,
	points: Number,
	table: String,
	date: { type: Number, default: datetime.now },
	fields: {},
	hash: String,
	lastupdated: { type: Number, default: datetime.now }
};

var leaderboardBanMap = {
	
};

var playerLevelMap = {
	publickey: String,
	global: Boolean,
	source: String,
	name: String,
	playername: String,
	playerid: String,
	fields: {},
	hash: String,
	data: String,
	date: { type: Number, default: datetime.now },
	votes: { type: Number, default: 0 },
	score: { type: Number, default: 0 },
	ratings: { },
	ratingslast100: [Number],
	ratingslast100average: Number,
	lastaggregated: { type: Number, default: 0 },
	lastupdated: { type: Number, default: datetime.now }
};

var playerLevelBanMap = {
	
};

var achievementMap = { 
	publickey: String,
	achievement: String,
	achievementkey: String,
	lastupdated: { type: Number, default: datetime.now }
};

var achievementPlayerMap = {
	publickey: String,
	achievementid: mongoose.Schema.Types.ObjectId,
	playerid: String,
	playername: String,
	source: String,
	fields: {},
	hash: String,
	date: { type: Number, default: datetime.now },
	lastupdated: { type: Number, default: datetime.now }
};
 

// setup
(function() {
		
	var collections = ["games", "gamevars", "leaderboard_scores", "leaderboard_bans", "playerlevel_levels", "playerlevel_bans", "achievements", "achievements_players"];
	
	mongodb.MongoClient.connect(config.mongodb.playtomic, function(error, db) {

	    if(error) {
	        console.log("connection failed: " + error);
	        return;
	    }
		
		var jobs = [];
		
		// creating collections
		collections.forEach(function(collection) {
			jobs.push(function() { 
				db.createCollection(collection, {}, next);
			});
		});	
		
		// create indexes
		jobs.push(function() { 
			db.collection("gamevars").createIndex([["publickey", 1], ["name", 1]], next); 
		});

		jobs.push(function() { 
			db.collection("leaderboard_scores").createIndex([["publickey", 1], ["hash", 1]], next); 
		});

		// advanced users may override the default index creation for leaderboards that are using their 
		// own exact-match indexing
		if(process.env.DISABLE_SCORE_INDEXES === null) {
			jobs.push(function() { 
				db.collection("leaderboard_scores").createIndex([["publickey", 1], ["points", -1]], next); 
			});
			jobs.push(function() { 
				db.collection("leaderboard_scores").createIndex([["publickey", 1], ["date", -1]], next); 
			});
			jobs.push(function() { 
				db.collection("leaderboard_scores").createIndex([["p", 1], ["date", -1]], next); 
			});
		}

		jobs.push(function() { 
			db.collection("leaderboard_bans").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			db.collection("playerlevel_levels").createIndex([["publickey", 1], ["date", -1]], next); 
		});
		jobs.push(function() { 
			db.collection("playerlevel_levels").createIndex([["publickey", 1], ["rating", -1]], next); 
		});
		jobs.push(function() { 
			db.collection("playerlevel_levels").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			db.collection("playerlevel_bans").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			db.collection("achievements").createIndex([["publickey", 1], ["hash", 1]], next); 
		});
		jobs.push(function() { 
			db.collection("achievements_players").createIndex([["publickey", 1], ["playerid", 1]], next); 
		});

		function next(error) {
			
			if(error) {
				console.log(error);
			}
			
			if(!jobs.length) {
				module.exports.ready = true;
				db.close();
			} else { 
				jobs.shift()();
			}
		}
		
		next();
	});
	
})();

module.exports = {
	ready: false,
	Game: mongoose.model("Game", new mongoose.Schema(gameMap, { collection: "games" })),
	GameVar: mongoose.model("GameVar", new mongoose.Schema(gamevarMap, { collection: "gamevars" })),
	Achievement: mongoose.model("Achievement", new mongoose.Schema(achievementMap, { collection: "achievements" })),
	AchievementPlayer: mongoose.model("AchievementPlayer", new mongoose.Schema(achievementPlayerMap, { collection: "achievements_players" })),
	LeaderboardScore: mongoose.model("LeaderboardScore", new mongoose.Schema(leaderboardScoreMap, { collection: "leaderboard_scores" })),
	PlayerLevel: mongoose.model("PlayerLevel", new mongoose.Schema(playerLevelMap, { collection: "playerlevel_levels" }))
};
