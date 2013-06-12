var config = require(__dirname + "/config.js"),
    db = require(__dirname + "/database.js"),
    md5 = require(__dirname + "/md5.js"),
    utils = require(__dirname + "/utils.js"),
    mongodb = require("mongodb"),
    objectid = mongodb.BSONPure.ObjectID,
    datetime = require(__dirname + "/datetime.js"),
    errorcodes = require(__dirname + "/errorcodes.js").errorcodes;

var leaderboards = module.exports = {

    /**
     * Lists scores from a leaderboard table
     * @param options:  table, url, highest, mode, page, perpage, filters ass. array, friendslist,
     * @param callback function (error, errorcode, numscores, scores)
     */
    list:function (options, callback) {

        // defaults
        if(!options.page) {
            options.page = 1;
        }

        if(!options.perpage) {
            options.perpage = 20;
        }

        if(!options.highest && !options.lowest) {
            options.highest = true;
        }

        var query = {
            
            filter: {
                publickey: options.publickey,
                table: options.table
            },
            
            limit: options.perpage,
            skip: (options.page - 1) * options.perpage,
            sort: {},
            cache: true,
            cachetime: 120
        };

        // per-source website or device scores, websites
		// get truncated to domain.com
        if(options.source) {
            query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
        }
        
        // filters for custom fields
        for(var x in options.filters) {
            query.filter["fields." + x] = options.filters[x];
        }
        
        // filtering for playerids
		var playerids = [];
		
        if(options.playerid && !options.excludeplayerid) {
            playerids.push(options.playerid);
        }
        
        if(options.friendslist) {
			playerids = playerids.concat(options.friendslist);
		}
		
		if(playerids.length > 0) {
            query.filter.playerid = { $in: playerids };
        }

        // date mode
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
        
        // sorting
        if(options.mode == "newest") {
            query.sort = { date: -1 };
        } else {
            query.sort = { points: options.highest || !options.lowest ? -1 : 1 };
        }

        // the scores
        db.playtomic.leaderboard_scores.getAndCount(query, function(error, scores, numscores){

            if(error) {
                callback("unable to load scores: " + error + " (api.leaderboards.list:104)", errorcodes.GeneralError);
                return;
            }

            // clean up scores
            if(!scores) {
                scores = [];
            }

            callback(null, errorcodes.NoError, numscores, clean(scores, query.skip + 1));
        });
    },

    /**
     * Saves a score
     * @param options: url, name, points, auth, playerid, table, highest, allowduplicates, customfields ass. array
     * @param callback function(error, errorcode)
     */
    save: function(options, callback) {

        // defaults
        if(!options.source) {
            options.source = "";
        } else {
			options.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
		}

        if(!options.playername) {
            callback("no name (" + options.playername + ")", errorcodes.InvalidName);
            return;
        }

        if(!options.table) {
            callback("no table name (" + options.table + ")", errorcodes.InvalidName);
            return;
        }

        if(!options.highest && !options.lowest) {
            options.highest = true;
        }

        // small cleanup
        var score = {};

        // fields that just aren't relevant, by doing it this way it's easier to extend because you can
        // just add more fields directly in your game and they will end up in your scores and returned
        // to your game
        var exclude = ["allowduplicates", "highest", "lowest", "numfields", "section", "action",
                        "ip", "date", "url", "rank", "points", "page", "perpage", "global", "filters", "debug"];

        for(var x in options) {
            if(exclude.indexOf(x) > -1) {
                continue;
            }

            score[x] = options[x];
        }

        score.hash = md5(options.publickey + 
						 options.ip + "." +
                         options.table + "." +
                         options.playername + "." +
                         options.playerid + "." +
                         options.highest + "." +
                         options.source);
        score.points = options.points;
        score.date = datetime.now;
		
        // check bans

        // insert
        if(options.hasOwnProperty("allowduplicates") && options.allowduplicates) {

            db.playtomic.leaderboard_scores.insert({doc: score, safe: true}, function(error, item) {

                if(error) {
                    callback("unable to insert score: " + error + " (api.leaderboards.save:192)", errorcodes.GeneralError);
                    return;
                }

                callback(null, errorcodes.NoError, item._id);
            });

            return;
        }

        // check for duplicates, by default we will assume highest unless
        // lowest is explicitly specified
        var dupequery = {
            filter: {
                hash: score.hash
            },
            limit: 1,
            cache: false,
            sort: options.highest ? {score : -1 } : {score: 1 }
        };

        db.playtomic.leaderboard_scores.get(dupequery, function(error, items) {

            // no duplicates
            if(items.length == 0) {

                db.playtomic.leaderboard_scores.insert({doc: score}, function(error, item) {

                    if(error) {
                        callback("unable to insert score: " + error + " (api.leaderboards.save:212)", errorcodes.GeneralError);
                        return;
                    }

                    callback(null, errorcodes.NoError, item._id);
                });

                return;
            }

            // check if the new score is higher or lower
            var dupe = items[0];
			
            if((dupe.points <= score.points && options.highest) || (dupe.points >= score.points && options.lowest)) {
				
				score._id = dupe._id;
				
                var query = {
                    filter: { _id: dupe._id },
                    doc: score
                };
				
                db.playtomic.leaderboard_scores.update(query, function(error, item) {

                    if(error) {
                        callback("unable to update score: " + error + " (api.leaderboards.save:240)", errorcodes.GeneralError);
                        return;
                    }

                    callback(null, errorcodes.NoError, item._id);
                });
            } else {
                callback(null, errorcodes.NotBestScore);
            }
        });
    },

    saveAndList: function(options, callback) {
		
        leaderboards.save(options, function(error, errorcode, insertedid) {

            if(error) {
                callback(error + " (api.leaderboards.saveAndList:232)", errorcode);
                return;
            }

            // get scores before or after
            var query = {
                filter: {
                    publickey: options.publickey,
                    table: options.table
                },
                sort: options.highest ? {score : -1} : {score: 1},
                cache: true,
                cachetime: 120
            };
			
			if(options.playerid && !options.excludeplayerid) {
				query.filter.playerid = options.playerid;
			}

            if(options.highest || !options.lowest) {
                query.filter.points = {"$gte": options.points};
            } else {
                query.filter.points = {"$lte": options.points};
            }

			if(options.filters) {
	            for(var x in options.filters) {
	                query.filter["fields." + x] = options.filters[x];
	            }
			}

            if(options.friendslist) {
                if(options.friendslist.length > 100) {
                    options.friendslist.length = 100;
                }

                query.filter.playerid = { $in: options.friendslist }
            }
			
			if(options.source) {
				query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
			}
			
            var serrorcode = errorcode;
			
            db.playtomic.leaderboard_scores.count(query, function(error, numscores) {

                if(error) {
                    callback(error + " (api.leaderboards.saveAndList:276)", errorcode);
                    return;
                }

				options.page = Math.ceil(numscores / options.perpage) ;
				
				console.log("save and list", options.page, numscores, options.perpage)
				
                leaderboards.list(options, function(error, errorcode, numscores, scores) {

                    if(error) {
                        callback(error + " (api.leaderboards.saveAndList:293)", errorcode);
                        return;
                    }

                    if(serrorcode > 0) {
                        errorcode = serrorcode;
                    }
					
					for(var i=0; i<scores.length; i++)
					{
						if(scores[i].scoreid == insertedid)
						{
							scores[i].submitted = true;
							break;
						}
					}

                    callback(null, errorcode, numscores, scores);
                })
            });
        });
    }
};

function clean(scores, baserank) {

    for(var i=0; i<scores.length; i++) {

        var score = scores[i];

        for(var x in score) {
            if(typeof(score[x]) == "String") {
                score[x] = utils.unescape(score[x]);
            }
        }

        for(var x in score.fields) {
            if(typeof(score.fields[x]) == "String") {
                score.fields[x] = utils.unescape(score.fields[x]);
            }
        }

        score.rank = baserank + i;
        score.scoreid = score._id.toString();
		score.rdate = utils.friendlyDate(utils.fromTimestamp(score.date));
        delete score._id;
        delete score.hash;
    }

    return scores;
}