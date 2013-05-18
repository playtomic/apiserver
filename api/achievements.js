var config = require(__dirname + "/config.js"),
    db = require(__dirname + "/database.js"),
    md5 = require(__dirname + "/md5.js"),
    utils = require(__dirname + "/utils.js"),
    mongodb = require("mongodb"),
    objectid = mongodb.BSONPure.ObjectID,
    datetime = require(__dirname + "/datetime.js"),
    errorcodes = require(__dirname + "/errorcodes.js").errorcodes,
	games = require(__dirname + "/games.js"),
	achievementlist = {};

var achievements = module.exports = {
	
	ready: false,
	
    /**
     * Returns all the loaded data for testing
     */
    data: function(callback) {
        return achievementlist;
    },
	
	/**
	 * Returns the awarded achievements in chronological order, optionally
	 * by the player and/or friends and optionally filtered
	 * @param options:  group, playerid, friendslist, {filter}, mode[today,last7days,last30days], datemin, datemax, page, perpage 
	 * @param callback function (error, errorcode, numawards, awards);
	 */
	stream: function(options, callback) {
		
        // defaults
        if(!options.page) {
            options.page = 1;
        }

        if(!options.perpage) {
            options.perpage = 20;
        }

        var query = {
            
            filter: {
                publickey: options.publickey
            },
            
            limit: options.perpage,
            skip: (options.page - 1) * options.perpage,
            sort: { date: -1 },
            cache: true,
            cachetime: 120
        };

        // per-source website or device achievements, websites
		// get truncated to domain.com
        if(options.source) {
            query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
        }
        
        // filters for custom fields
		if(options.filters) {
	        for(var x in options.filters) {
	            query.filter["fields." + x] = options.filters[x];
	        }
		}
        
        // filtering for playerids
		var playerids = [];
		
        if(options.playerid) {
            playerids.push(options.playerid);
        }
        
        if(options.friendslist) {
			playerids = playerids.concat(options.friendslist);
		}
		
		if(playerids.length > 0) {
            query.filter.playerid = { $in: playerids };
        }
		
		// modes
        // date mode
        switch(options.mode) {
            case "today":
                query.filter.date = {"$gte": datetime.now - (24 * 60 * 60)};
                break;
            
           case "last7days":
               query.filter.date = {"$gte": (datetime.now - (7 * 24 * 60 * 60))};
                break;
            
            case "last30days":
                query.filter.date = {"$gte": (datetime.now - (30 * 24 * 60 * 60))};
                break;
        }
		
		if(options.group) {
			
			var aggregate = [
				{
					$group: {
						_id: "$playerid", 
						playername: {$first: "$playername"}, 
						source: {$last: "$source"}, 
						date: {$last: "$date"}, 
						oldest: {$first: "$date"},
						achievementid: {$last: "$achievementid"}, 
						fields: {$last: "$fields"},
						awards: {$sum: 1}
					}
				},
				{
					$project: { 
						date: "$date", 
						oldest: "$oldest",
						achievementid: "$achievementid", 
						fields: "$fields", 
						playername: "$playername", 
						source: "$source",
						awards: "$awards"
					}
				},
				{
					$sort: { date: -1 }
				},
				{
					$limit: query.limit
				},
				{
					$skip: query.skip
				}
			];
						
			var count = [
				{
					$group: {
						_id: "$playerid"
					}
				},
				{
					$group: { 
						_id: 1,
						count: {$sum: 1}
					}
				}
			];
			
			if(Object.keys(query.filter).length) {
				for(var x in query.filter) {
					var m = {};
					m[x] = query.filter[x];
					aggregate.splice(0, 0, { $match: m }); // matching has to go first in the pipeline
					count.splice(0, 0, { $match: m }); 
				}
			}
			
			db.playtomic.achievements_players.aggregateAndCount({ aggregate: aggregate, count: count }, function(error, ritems, numitems) {
				
	            if(error) {
	                callback("unable to aggregate achievements: " + error + " (api.achievements.list:140)", errorcodes.GeneralError);
	                return;
	            }
				
				var items = JSON.parse(JSON.stringify(ritems));
				var index = achievementIndex(options.publickey);
				
				for(var i=0; i<items.length; i++) {
					items[i].awarded = index[items[i].achievementid];
					items[i].playerid = items[i]._id;
					items[i].rdate = utils.friendlyDate(utils.fromTimestamp(items[i].date));
					delete items[i]._id;
					delete items[i].hash;
					delete items[i].publickey;
					delete items[i].achievementid;
				}
				
				callback(null, errorcodes.NoError, items, numitems);
			});
		} else {
			db.playtomic.achievements_players.getAndCount(query, function(error, ritems, numitems) {
	            if(error) {
	                callback("unable to load achievements: " + error + " (api.achievements.list:67)", errorcodes.GeneralError);
	                return;
	            }
				
				var items = JSON.parse(JSON.stringify(ritems));
				var index = achievementIndex(options.publickey);
				
				for(var i=0; i<items.length; i++) {
					items[i].awarded = index[items[i].achievementid];
					items[i].rdate = utils.friendlyDate(utils.fromTimestamp(items[i].date));
					delete items[i]._id;
					delete items[i].hash;
					delete items[i].publickey;
					delete items[i].achievementid;
				}
				
				callback(null, errorcodes.NoError, items, numitems);
			});
		}
	},

    /**
     * Lists achievements, optionally including the player and friends' status
     * @param options:  table, url, highest, mode, page, perpage, filters ass. array, friendslist,
     * @param callback function (error, errorcode, achievements)
     */
    list: function(options, callback) {
		
		// just the list
		if(!options.playerid && !options.friendslist) {
			callback(null, errorcodes.NoError, achievementlist[options.publickey]);
			return;
		}
		
		// no achievements
		if(achievementlist[options.publickey].length == 0) {
			callback(null, errorcodes.NoError, achievementlist[options.publickey]);
			return;
		}
		
        var query = {
            filter: {
                publickey: options.publickey
            },
			sort: { 
				date: -1
			},
            cache: true,
            cachetime: 120
        };
		
		// merge the player and/or friends' achievements into the list
		var playerids = [];
		
		if(options.playerid) {
			playerids.push(options.playerid);
		}
		
		if(options.friendslist) {
			playerids = playerids.concat(options.friendslist);		
		}
		
		if(playerids.length > 0) { 
			query.filter.playerid = { 
				$in: playerids
			}
		}
		
		// we need a copy cause we'll mess with it
		var achievements = JSON.parse(JSON.stringify(achievementlist[options.publickey]));
		
		db.playtomic.achievements_players.get(query, function(error, pplayers) {
			
            if(error) {
                callback("unable to load achievements: " + error + " (api.achievements.list:67)", errorcodes.GeneralError);
                return;
            }
			
			// we need a copy of the players as well because it might be cached
			// and we mess the format up deleting properties
			var players = JSON.parse(JSON.stringify(pplayers));
			
			// achievement index
			var index = achievementIndex(options.publickey);
		
			// apply players
			for(var i=0; i<players.length; i++) {

				var player = players[i];
				var achievement = index[player.achievementid];
				
				// a deleted achievement
				if(!achievement) {
					continue;
				}
				
				// remove unnecessary fields				
				delete player._id;
				delete player.hash;
				delete player.publickey;
				delete player.achievementid;
				
				player.rdate = utils.friendlyDate(utils.fromTimestamp(player.date));
				
				// the player's achievement
				if(player.playerid == options.playerid) {
					if(!achievement.player) {
						achievement.player = player;
					}
					continue;
				}

				// a friend's achievement
				if(!achievement.friends) {
					achievement.friends = {};
				}

				if(!achievement.friends[player.playerid]) {
					achievement.friends[player.playerid] = player;
				}
			}
			
			// convert to arrays
			var results = [];
			
			for(var ach in index) {
				var achievement = index[ach];
				
				if(achievement.friends) {
					
					var friends = [];
					
					for(var playerid in index[ach].friends) {
						friends.push(index[ach].friends[playerid]);
					}
					
					achievement.friends = friends;
				}
				
				results.push(achievement);
			}
			
			callback(null, errorcodes.NoError, results);
			return;
		});
    },

    /**
     * Saves an achievement
     * @param options: achievement, achievementkey, playerid, playername, source, {fields}, allowduplicates, overwrite
     * @param callback function(error, errorcode)
     */
    save: function(options, callback) {
		
		if(!options.playerid) {
			callback("Missing playerid (api.achievements.save:129)", errorcodes.NoPlayerId);
			return;
		}
		
		if(!options.playername) {
			callback("Missing player name (api.achievements.save:132)", errorcodes.NoPlayerName);
			return;
		}
		
		if(!options.achievement || !options.achievementkey) {
			callback("Missing achievement (api.achievements.save:136)", errorcodes.NoAchievement);
			return;
		}
		
		if(!options.source) {
			options.source = "";
		}

		// validate the achievement
		var gameachievements = achievementlist[options.publickey];
		var found = false;
		var correct = false;
		var achievementid;
		
		for(var i=0; i<gameachievements.length; i++) {
			if(gameachievements[i].achievement.toLowerCase() != options.achievement.toLowerCase()) {
				continue;
			}
			
			found = true;
			correct = gameachievements[i].achievementkey.toLowerCase() == options.achievementkey.toLowerCase(); 
			achievementid = gameachievements[i].achievementid;
			break;
		}
		
		if(!found || !correct) {
			callback("Invalid achievement (api.achievements.save:158)", errorcodes.InvalidAchievement);
			return;
		}
		
		var hash = md5(options.publickey + "." + 
						achievementid + "." + 
						options.playerid + "." + 
						options.source + " ." + 
						JSON.stringify(options.fields || {}));
		
        var achievement = {
			publickey: options.publickey,
			achievementid: achievementid,
			playerid: options.playerid || "",
			playername: options.playername || "",
			source: options.source || "",
			fields: options.fields || {},
			hash: hash,
	        date: datetime.now
		};
		
        // check for duplicates, if there is none we can insert otherwise we require 'overwrite'
        var dupequery = {
            filter: {
				publickey: options.publickey,
                hash: achievement.hash
            },
            limit: 1,
            cache: false,
            sort: options.highest ? {score : -1 } : {score: 1 }
        };

        db.playtomic.achievements_players.get(dupequery, function(error, items) {

            // no duplicates
            if(items.length == 0) {

                db.playtomic.achievements_players.insert({doc: achievement}, function(error, item) {

                    if(error) {
                        callback("unable to insert achievement: " + error + " (api.achievements.save:185)", errorcodes.GeneralError);
                        return;
                    }

                    callback(null, errorcodes.NoError);
                });

                return;
            }
			
			// do we allow duplicates?
	        if(options.hasOwnProperty("allowduplicates") && options.allowduplicates) {

	            db.playtomic.achievements_players.insert({doc: achievement, safe: true}, function(error, item) {

	                if(error) {
	                    callback("unable to insert achievement: " + error + " (api.achievements.save:178)", errorcodes.GeneralError);
	                    return;
	                }

	                callback(null, errorcodes.AlreadyHadAchievement);
	            });

	            return;
	        }
			
			// can we overwrite?
			 if(options.hasOwnProperty("overwrite") && options.overwrite) {

				achievement._id = items[0]._id;
			
	            var query = {
	                filter: { _id: achievement._id },
	                doc: achievement
	            };
			
	            db.playtomic.achievements_players.update(query, function(error, item) {

	                if(error) {
	                    callback("unable to update achievement: " + error + " (api.achievements.save:208)", errorcodes.GeneralError);
	                    return;
	                }

	                callback(null, errorcodes.AlreadyHadAchievement);
	            });
				
				return;
			}
			
			// if we're still here we got rejected
			callback("already had achievement and no overwrite or allowduplicate options were set.", errorcodes.AlreadyHadAchievementNotSaved);
        });
    }
};

function achievementIndex(publickey) {
	var index = {};
	var achievements = achievementlist[publickey];
	for(var i=0; i<achievements.length; i++) {
		index[achievements[i].achievementid] = achievements[i];
	}
	return JSON.parse(JSON.stringify(index));
}

// Data cache
(function() {
    var lastupdated = 0;

    function refresh() {

        db.playtomic.achievements.get({filter: {$or: [{lastupdated: {$gte: lastupdated}}, {lastupdated: {$exists: false}}]}}, function(error, achlist)
        {
            if(error) {
                console.log("ACHIEVEMENTS failed to retrieve results from mongodb: " + error);
                return setTimeout(refresh, 1000);
            }
			
			var newlist = {};

            for(var i=0; i<achlist.length; i++) {
				
				achlist[i].achievementid = achlist[i]._id;
				
				var publickey = achlist[i].publickey;
				
				if(!newlist[publickey]) {
					newlist[publickey] = [];
				}
				
				delete achlist[i]._id;
				delete achlist[i].publickey;
				
				newlist[publickey].push(achlist[i]);

                if(achlist[i].lastupdated > lastupdated) {
                    lastupdated = achlist[i].lastupdated;
                }
            }
			
			achievementlist = newlist;
            achievements.ready = true;
            return setTimeout(refresh, 30000);
        });
    }

    refresh();
})();