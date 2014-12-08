var db = require(__dirname + "/database.js"),
    md5 = require(__dirname + "/md5.js"),
    utils = require(__dirname + "/utils.js"),
    datetime = require(__dirname + "/datetime.js"),
    errorcodes = require(__dirname + "/errorcodes.js").errorcodes,
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
     * Forces the local cache to update
     */
    forceRefresh: function() {
    	lastupdated = 0;
    	achievementlist = {};
    	refreshCache();
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
            sort: "-date"
        };

        // per-source website or device achievements, websites
		// get truncated to domain.com
        if(options.source) {
            query.filter.source = utils.baseurl(options.source);
        }
        
        // filters for custom fields
        var x;
        
		if(options.filters) {
            for(x in options.filters) {
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
		if(!options.mode) {
			options.mode = "alltime";
		} else {
			options.mode = options.mode.toLowerCase();
		}

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
			var aggregate = [{
					$group: {
						_id: "$playerid", 
						playername: {$last: "$playername"}, 
						oldest: { $first: "$date"},
						awards: { $sum: 1},
						achievements: { $push: { achievementid: "$achievementid", date: "$date", fields: "$fields", source: "$source"  } }
					}
				}, {
					$project: { 
						playername: "$playername",
						awards: "$awards",
						oldest: "$oldest",
						achievements: "$achievements"
					}
				}, {
					$sort: { date: -1 }
				}, {
					$limit: query.limit
				}, {
					$skip: query.skip
				}
			];
						
			var count = [{
					$group: {
						_id: "$playerid"
					}
				}, {
					$group: { 
						_id: 1,
						count: {$sum: 1}
					}
				}
			];
			
			if(query.filter && Object.keys(query.filter).length) {
				for(x in query.filter) {
					var m = {};
					m[x] = query.filter[x];
					aggregate.splice(0, 0, { $match: m }); // matching has to go first in the pipeline
					count.splice(0, 0, { $match: m }); 
				}
			}
			
			return db.AchievementPlayer.aggregate(aggregate, function (error, ritems) {
                if(error) {
                    callback("unable to aggregate achievements: " + error + " (api.achievements.list:140)", errorcodes.GeneralError);
                    return;
                }
                
                db.AchievementPlayer.aggregate(count, function(error, numitems) {
	            	 if(error) {
	                    callback("unable to count aggregate achievements: " + error + " (api.achievements.list:140)", errorcodes.GeneralError);
	                    return;
	                }
	                
					var items = JSON.parse(JSON.stringify(ritems));
					var index = achievementlist[options.publickey].idindex;
					
					for(var i=0, len=items.length; i<len; i++) {
						for(var j=0, jlen=items[i].achievements.length; j<jlen; j++) {
							items[i].achievements[j].achievement = index[items[i].achievements[j].achievementid].achievement;
							items[i].playerid = items[i]._id;
							delete items[i]._id;
							delete items[i].achievementid;
							delete items[i].achievementkey;
						}
					}
				
					callback(null, errorcodes.NoError, items, numitems[0].count);
                });
			});
		} 
		
		db.AchievementPlayer.find(query.filter).limit(query.limit).skip(query.skip).sort("-date").exec(function(error, ritems) {
            if(error) {
                callback("unable to load achievements: " + error + " (api.achievements.list:67)", errorcodes.GeneralError);
                return;
            }
            
            db.AchievementPlayer.count(query.filter, function(error, numitems) {
            	
                if(error) {
                    callback("unable to count achievements: " + error + " (api.achievements.list:67)", errorcodes.GeneralError);
                    return;
                }
            
				var items = JSON.parse(JSON.stringify(ritems));
				var index = achievementlist[options.publickey].idindex
				
				for(var i=0, len=items.length; i<len; i++) {
					items[i].awarded = index[items[i].achievementid];
					items[i].rdate = utils.friendlyDate(utils.fromTimestamp(items[i].date));
					delete items[i]._id;
					delete items[i].publickey;
					delete items[i].achievementid;
					delete items[i].achievementkey;
				}
				
				callback(null, errorcodes.NoError, items, numitems);
            });
		});
	},

    /**
     * Lists achievements, optionally including the player and friends' status
     * @param options:  table, url, highest, mode, page, perpage, filters ass. array, friendslist,
     * @param callback function (error, errorcode, achievements)
     */
    list: function(options, callback) {
	
		// no achievements
		if(!achievementlist[options.publickey] || !achievementlist[options.publickey].achievements.length) {
			callback(null, errorcodes.NoError, achievementlist[options.publickey]);
			return;
		}
		
		// just the list
		if(!options.playerid && !options.friendslist) {
			callback(null, errorcodes.NoError, achievementlist[options.publickey].achievements);
			return;
		}
	
        var query = {
            publickey: options.publickey
        };
		
		// merge the player and/or friends' achievements into the list
		var playerids = [];
		
		if(options.playerid) {
			playerids.push(options.playerid);
		}
		
		if(options.friendslist) {
			playerids = playerids.concat(options.friendslist);		
		}
		
		var achievements = achievementlist[options.publickey].achievements;
		
		if(playerids.length === 0 || achievements.length === 0) {
			return callback(null, errorcodes.NoError, achievements);
		}
		
		var index = JSON.parse(JSON.stringify(achievementlist[options.publickey].idindex));
		
		// get players with the achievements
		query.playerid = playerids.length > 1 ? { $in: playerids } : playerids[0];
		db.AchievementPlayer.find(query).exec(function(error, players) {
			if(error) {
				return callback("Error occurred getting player achievements", error);
			}

			var player, achievement;
			
			for(var i=0, len=players.length; i<len; i++) {
				player = players[i].toObject();
				achievement = index[player.achievementid];
				
				if(!achievement) {
					continue;
				}
				
				// remove unnecessary fields				
				delete player._id;
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
					achievement.friends = [];
				}
				
				achievement.friends.push(players[i].toObject());
			}
			
			// convert to arrays
			var results = [];
			for(var ach in index) {
				achievement = index[ach];
				results.push(achievement);
			}
			
			return callback(null, errorcodes.NoError, results);
		});
    },

    /**
     * Saves an achievement
     * @param options: achievement, achievementkey, playerid, playername, source, {fields}, allowduplicates, overwrite
     * @param callback function(error, errorcode)
     */
    save: function(options, callback) {
		
		if(!options.playerid) {
			return callback("Missing playerid (api.achievements.save:129)", errorcodes.NoPlayerId);
		}
		
		if(!options.playername) {
			return callback("Missing player name (api.achievements.save:132)", errorcodes.NoPlayerName);
		}
		
		if(!options.achievement || !options.achievementkey) {
			return callback("Missing achievement (api.achievements.save:136)", errorcodes.NoAchievement);
		}

		if(!achievementlist[options.publickey] || !achievementlist[options.publickey].index[options.achievement]) {
			return callback("Game has no achievements configured (api.achievements.save:366", errorcodes.InvalidAchievement);
		}
		
		var ach = achievementlist[options.publickey].index[options.achievement];
		
		if(!ach || !ach.achievementkey) {
			return callback("ach has no achievementkey", errorcodes.InvalidAchievement);
		}
		
		var correct = !ach || ach.achievementkey == options.achievementkey;
		
		if(!ach || !correct) {
			return callback("Invalid achievement (api.achievements.save:158)", errorcodes.InvalidAchievement);
		}
		
        var achievement = {
			publickey: options.publickey,
			achievementid: ach.achievementid,
            date: datetime.now
		};
		
		if(options.playerid) {
			achievement.playerid = options.playerid;
		}
		
		if(options.playername) {
			achievement.playername = options.playername;
		}
		
		if(options.source) {
			achievement.source = utils.baseurl(options.source);
		}
		
		if(options.fields && Object.keys(options.fields).length > 0) {
			achievement.fields = options.fields;
		}
		
        // check for duplicates, if there is none we can insert otherwise we require 'overwrite'
        var query = {
			publickey: achievement.publickey,
            achievementid: achievement.achievementid,
            playerid: options.playerid
        };
        
        return db.AchievementPlayer.findOne(query).exec(function(error, item) {
        	if(error) {
        		return callback(error);
        	}
        	
            // no duplicates
            if(!item) {
            	var nach = new db.AchievementPlayer(achievement);
                return nach.save(function(error) {
                    if(error) {
                        return callback("unable to insert achievement: " + error + " (api.achievements.save:185)", errorcodes.GeneralError);
                    }
                    return callback(null, errorcodes.NoError);
                });
            }
            
			// do we allow duplicates?
	        if(options.allowduplicates === true) {
	            return new db.AchievementPlayer(achievement).save(function(error) {
	                if(error) {
	                    return callback("unable to insert achievement: " + error + " (api.achievements.save:178)", errorcodes.GeneralError);
	                }
	                return callback(null, errorcodes.AlreadyHadAchievementSaved);
	            });
	        }
	        
			// can we overwrite?
            if(options.overwrite === true) {
                return db.AchievementPlayer.update({ _id: item._id }, achievement, function(error) {
                    if(error) {
                        return callback("unable to update achievement: " + error + " (api.achievements.save:208)", errorcodes.GeneralError);
                    }
                    return callback(null, errorcodes.AlreadyHadAchievementSaved);
                });
            }
			
			// if we're still here we got rejected
			return callback(null, errorcodes.AlreadyHadAchievementNotSaved);
        });
    }
};

// Data cache
var lastupdated = 0;

function refreshCache() {
	var filter = {$or: [{lastupdated: {$gte: lastupdated}}, {lastupdated: {$exists: false}}]};
    db.Achievement.find(filter).exec(function(error, achlist) {
        if(error) {
            console.log("ACHIEVEMENTS failed to retrieve results from mongodb: " + error);
            return setTimeout(refreshCache, 1000);
        }

        var patchid = {_id: null},
        	now = { lastupdated: datetime.now - 1 },
        	noupsert = { upsert: false };
        	
        function ignoreResponse(){}
        
        for(var i=0, len=achlist.length; i<len; i++) {
			var achievement = achlist[i].toObject();
			var pk = achievement.publickey;
			
			if(!achievement.lastupdated) {
				patchid._id = achievement._id;
				now.lastupdated = datetime.now - 1;
				db.Achievement.update(patchid, now, noupsert, ignoreResponse);
			} 
			
			if(achievement.lastupdated > lastupdated) {
                lastupdated = achievement.lastupdated;
            }
			
			achievement.achievementid = achievement._id;
			delete achievement._id;
			delete achievement.__v;
			delete achievement.publickey;
			delete achievement.lastupdated;
			
			if(!achievementlist[pk]) {
				achievementlist[pk] = {
					achievements: [achievement],
					index: {},
					idindex: {}
				};
				achievementlist[pk].index[achievement.achievement] = achievement;
				achievementlist[pk].idindex[achievement.achievementid] = achievement;
				continue;
			}
			
			var oldachievement = achievementlist[pk].index[achievement.achievement];
			if(oldachievement) {
				achievementlist[pk].achievements.splice(achievementlist[pk].achievements.indexOf(oldachievement), 1);
			}
			
			achievementlist[pk].index[achievement.achievement] = achievement;
			achievementlist[pk].idindex[achievement.achievementid] = achievement;
			achievementlist[pk].achievements.push(achievement);
		}
		
        achievements.ready = true;
        return setTimeout(refreshCache, 30000);
    });
}

refreshCache();