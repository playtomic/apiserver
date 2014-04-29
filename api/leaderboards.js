var db = require(__dirname + "/database.js"),
    md5 = require(__dirname + "/md5.js"),
    utils = require(__dirname + "/utils.js"),
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
            cache: options.hasOwnProperty("cache") ? options.cache : true,
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
        var playerids = options.friendslist || [];
		
        if(options.playerid && !options.excludeplayerid) {
            playerids.push(options.playerid);
        }
		
		if(playerids.length > 1) {
            query.filter.playerid = { $in: playerids };
        } else if(playerids.length == 1) {
            query.filter.playerid = playerids[0];
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
            callback("no table name (" + options.table + ")", errorcodes.InvalidLeaderboardId);
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

                callback(null, errorcodes.NoError, item._id, item);
            });

            return;
        }

        // check for duplicates, by default we will assume highest unless lowest is explicitly specified
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
            if(!items.length) {
                
                db.playtomic.leaderboard_scores.insert({doc: score}, function(error, item) {
                    
                    if(error) {
                        callback("unable to insert score: " + error + " (api.leaderboards.save:212)", errorcodes.GeneralError);
                        return;
                    }
                    
                    callback(null, errorcodes.NoError, item._id, item);
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
                    
                    callback(null, errorcodes.NoError, item._id, item);
                });
            } else {
                callback(null, errorcodes.NotBestScore);
            }
        });
    },

    saveAndList: function(options, callback) {
        
        //console.log("---");
		
        leaderboards.save(options, function(error, errorcode, insertedid, insertedscore) {

            if(error) {
                callback(error + " (api.leaderboards.saveAndList:232)", errorcode);
                return;
            }

             if(options.lowest) {
                options.highest = false;
             }

            // get scores before or after
            var query = {
                filter: {
                    publickey: options.publickey,
                    table: options.table
                },
                sort: options.highest ? {points : -1} : {points: 1},
                cache: true,
                cachetime: 120
            };
			
			if(options.playerid && !options.excludeplayerid) {
				query.filter.playerid = options.playerid;
			}

			if(options.filters) {
                for(var x in options.filters) {
                    query.filter["fields." + x] = options.filters[x];
                }
			}
			
            var playerids = options.friendslist || [];
            
            if(options.playerid && !options.excludeplayerid) {
                playerids.push(options.playerid);
            }
            
            if(playerids.length > 1) {
                query.filter.playerid = { $in: playerids };
            } else if(playerids.length == 1) {
                query.filter.playerid = playerids[0];
            }
            
			if(options.source) {
				query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
			}
			
            // index the freshly saved score
            manuallyIndexScore(query.filter, options.highest, options.points);
            var serrorcode = errorcode;
            
            rank(query.filter, options.highest, options.points, function(error, numscores)
            {
                options.page = Math.ceil((numscores + 1) / options.perpage);
                
                leaderboards.list(options, function(error, errorcode, numscores, scores) {
                    
                    if(error) {
                        callback(error + " (api.leaderboards.saveAndList:293)", errorcode);
                        return;
                    }
                    
                    if(serrorcode > 0) {
                        errorcode = serrorcode;
                    }
                    
                    var foundsubmitted = false;
                    var i;
                    
                    for(i=0; i<scores.length; i++)
                    {
                        if(scores[i].scoreid == insertedid)
                        {
                            scores[i].submitted = true;
                            foundsubmitted = true;
                        }
                    }

                    // we can miss if someone requested the page we're on and the next
                    // person got stuck with the cached results, for this case we find
                    // where they should be and inject them
                    var inserted = false;
                    if(!foundsubmitted) { 
                        for(i=0; i<scores.length; i++) {

                            if( (options.highest && scores[i].points > insertedscore.points) ||
                               (!options.highest && scores[i].points < insertedscore.points)) {
                                continue;
                            }

                            scores.splice(i, 0, insertedscore);
                            inserted = true;
                            break;
                        }

                        scores.pop();

                        if(!inserted) {
                            scores.push(insertedscore);
                        }
                    }

                    callback(null, errorcode, numscores, scores);
                });
            });
        });
    }
};

/**
 * Strips unnceessary data and tidies a score object
 */
function clean(scores, baserank) {

    for(var i=0; i<scores.length; i++) {

        var score = scores[i],
            x;

        for(x in score) {
            if(typeof(score[x]) == "String") {
                score[x] = utils.unescape(score[x]);
            }
        }

        for(x in score.fields) {
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


/*
 * Gets the rank of a score based on its filtering
 * either from an existing index, or manually while
 * it creates a new index
 */
function rank(filter, highest, points, callback) {

    // no indexes for individual players
    if(filter.playerid) { 
        return rankManual(filter, highest, points, callback);
    }

    var hash = md5(JSON.stringify(filter) + "." + highest),
        found,
        i;

    // the index itself exists, we check if we have the score 
    // and if not we add it to the index
    if(index[hash]) {

        var arr = index[hash];

        /*var totalscores = 0;

        for(i=0; i<arr.length; i++) {
            totalscores += arr[i].scores;
            console.log(JSON.stringify(arr[i]));
        }*/

        var before = 0;
        found = false;

        for(i=0; i<arr.length; i++) {
 
            if((highest && arr[i].points > points) || (!highest && arr[i].points < points)) {
                before += arr[i].scores;
                continue;
            }

            found = true;
            break;
        }

        if(!found) {
            manuallyIndexScore(filter, highest, points);
        }

        return callback(null, before);
    } 

    // check if we already have this index queued
    found = false;
    for(i=0; i<indexes.length; i++) {
        if(indexes[i].key == hash) {
            found = true;
            break;
        }
    }

    // create the inde
    if(!found) {
        indexes.push({ 
            key: hash, 
            filter: filter,
            highest: highest,
            lastupdated: 0,
            lastcheck: 0
        });
    }

    // manually get this score's rank
    return rankManual(filter, highest, points, callback);
}

/**
 * Manually counts the scores that occured
 * before another one, this should only happen
 * the first few times while the leaderboard
 * index is being built
 */
function rankManual(filter, highest, points, callback) {
    filter = JSON.parse(JSON.stringify(filter));
    filter.points = highest ? { $gte: points } : { $lte: points };

    db.playtomic.leaderboard_scores.count({ filter: filter }, function(error, numscores) { 
        return callback(error, numscores);
    });
}

/**
 * Adds a score to our index manually which is eventually
 * removed when the db is re-polled
 */
function manuallyIndexScore(filter, highest, points) {

    var hash = md5(JSON.stringify(filter) + "." + highest);

    if(!index[hash]) {
        return;
    }

    var arr = index[hash];
    var inserted = false;
    var i;

    for(i=0; i<arr.length; i++) {

        if((highest && arr[i].points > points) || (!highest && arr[i].points < points)) {
            continue;
        }

        if(arr[i].points == points) {
            arr[i].scores++;
        } else {
            arr.splice(i, 0, { points: points, scores: 1});
        }

        inserted = true;
        break;
    }

    if(!inserted) {
        arr.push({points: points, scores: 1});
    }

    // add the delete to the index
    for(i=0; i<indexes.length; i++) {
        if(indexes[i].key != hash) {
            continue;
        }

        if(!indexes[i].delete) {
            indexes[i].delete = [];
        }

        indexes[i].delete.push(points);
    }
}

var index = {};
var indexes = [];

(function() {

    function load() {

        if(!indexes.length) {
            return setTimeout(load, 5000);
        }
        
        // sort by last updated]
        indexes.sort(function(a, b) { 
            return a.lastupdated < b.lastupdated ? 1 : -1;
        });
        
        // most recent data is less than 30 secounds old
        if(datetime.now - indexes[0].lastcheck < 30) {
            return setTimeout(load, 1000);
        }
        
        var zindex = indexes[0],
        pindex = index[zindex.key] || [];
        zindex.lastcheck = datetime.now;
        
        var query = { 
            filter: zindex.filter,
            fields: { 
                points: 1,
                date: 1
            },
            sort: { points: zindex.highest ? -1 : 1 }
        };
        
        query.filter.date = {$gt: zindex.lastupdated };
        
        var pk = zindex.key;
        
        db.playtomic.leaderboard_scores.get(query, function(error, scores) {
            
            if(error || !scores.length) {
                return setTimeout(load, 1000);
            }
            
            var ind = {},
                score,
                i;
                
            // fold the existing data back into our new index
            // because the queries only return partial datasets
            for(i=0; i<pindex.length; i++) {
                ind[pindex[i].points] = pindex[i];
            }
            
            // delete anything we manually added
            if(zindex.delete && zindex.delete.length) {
                for(i=0; i<zindex.delete.length; i++) {
                    //console.log("deleting", zindex.delete[i], JSON.stringify(ind[zindex.delete[i]]));;
                    ind[zindex.delete[i]].scores--;
                }
                
                zindex.delete.length = 0;
            }
            
            // add the new data
            for(i=0; i<scores.length; i++)  {
                score = scores[i];
                
                if(!ind[score.points]) {
                    ind[score.points] = { points: score.points, scores: 1 };
                } else {
                    ind[score.points].scores++;
                }
                
                if(score.date > zindex.lastupdated) {
                    zindex.lastupdated = score.date;
                }
            }

            // pull it back out into a sorted array
            var arr = [];
            
            for(var x in ind) {
                arr.push(ind[x]);
            }
            
            arr.sort(function(a, b) { 
                return zindex.highest 
                    ? (a.points < b.points ? 1 : -1)
                    : (a.points > b.points ? 1 : -1);
            });
            
            index[pk] = arr;
            setTimeout(load, 1000);
        });
    }

    load();
})();