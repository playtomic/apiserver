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
    list: function(options, callback) {

        // defaults
        options.page = options.page || 1;
        options.perpage = options.perpage || 20;
        options.highest = options.lowest !== true;

        var query = {
            filter: {
                publickey: options.publickey,
                table: options.table
            },
            limit: options.perpage,
            skip: (options.page - 1) * options.perpage,
            sort: {}
        };

        // per-source website or device scores, websites
		// get truncated to domain.com
        if(options.source) {
            query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
        }
        
        if(options.filters && Object.keys(options.filters).length > 0) {
            query.filter.fields = {};
            for(var x in options.filters) {
                query.filter.fields[x] = options.filters[x];
            }
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
        options.mode = (options.mode || "alltime").toLowerCase();
		
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
            query.sort = "-date";
        } else {
            query.sort = options.highest ? "-points" : "points";
        }

        // the scores
        db.LeaderboardScore.find(query.filter).sort(query.sort).limit(query.limit).skip(query.skip).exec(function(error, scores){

            if(error) {
                callback("unable to load scores: " + error + " (api.leaderboards.list:99)", errorcodes.GeneralError);
                return;
            }
            
            db.LeaderboardScore.count(query.filter, function(error, numscores) {
                
                if(error) {
                    callback("unable to count scores: " + error + " (api.leaderboards.list:104)", errorcodes.GeneralError);
                    return;
                }
            
                scores = scores || [];
                callback(null, errorcodes.NoError, numscores, clean(scores, query.skip + 1));
            });
        });
    },

    /**
     * Saves a score
     * @param options: url, name, points, auth, playerid, table, highest, allowduplicates, customfields ass. array
     * @param callback function(error, errorcode)
     */
    save: function(options, callback) {

        if(!options.playername) {
            callback("no name (" + options.playername + ")", errorcodes.InvalidName);
            return;
        }

        if(!options.table) {
            callback("no table name (" + options.table + ")", errorcodes.InvalidLeaderboardId);
            return;
        }
        
        if(options.source ) {
            options.source = utils.baseurl(options.source);
        }
		
        options.highest = options.lowest !== true;

        // small cleanup
        var score = {};

        // fields that aren't relevant to our score
        var exclude = ["allowduplicates", "highest", "lowest", "numfields", "section", "action",
                        "ip", "date", "url", "rank", "points", "page", "perpage", "global", "filters", "debug"];

        for(var x in options) {
            if(exclude.indexOf(x) > -1) {
                continue;
            }
            score[x] = options[x];
        }

        score.hash = md5([options.publickey, options.ip, options.table, options.playername, 
                          options.playerid, options.highest, options.source].join("."));
        score.points = options.points;
	
	score.date = datetime.now;
		
        // check bans

        // insert
        if(options.allowduplicates === true) {
            var mscore = new db.LeaderboardScore(score);
            return mscore.save(function(error, item) {
                if(error) {
                    return callback("unable to insert score: " + error + " (api.leaderboards.save:166)", errorcodes.GeneralError);
                }

                return callback(null, errorcodes.NoError, item._id, item);
            });
        }

        // check for duplicates, by default we will assume highest unless lowest is explicitly specified
        var sort = options.highest ? "-score" : "score",
            query = { 
                hash: score.hash
            };
        
        db.LeaderboardScore.findOne(query).sort(sort).exec(function(error, dupe) {
            if(error) {
                return callback("unable to check dupes: " + error + " (api.leaderboards.save:212)", errorcodes.GeneralError);
            }
            
            // no duplicates
            if(!dupe) {
                var mscore = new db.LeaderboardScore(score);
                return mscore.save(function(error) {
                    
                    if(error) {
                        return callback("unable to insert score: " + error + " (api.leaderboards.save:212)", errorcodes.GeneralError);
                    }
                    
                    return callback(null, errorcodes.NoError);
                });
            }
            
            // check if the new score is higher or lower
            if((dupe.points > score.points && options.highest) || (dupe.points < score.points && !options.highest)) {
                callback(null, errorcodes.NotBestScore);   
                return;
            }
                            
            db.LeaderboardScore.update( { _id: dupe._id }, { points: score.points, date: score.date, fields: score.fields }, { upsert: false }, function(error, item) {
                if(error) {
                    callback("unable to update score: " + error + " (api.leaderboards.save:240)", errorcodes.GeneralError);
                    return;
                }
                
                callback(null, errorcodes.NoError, item._id, item);
            });
        });
    },

    saveAndList: function(options, callback) {
        leaderboards.save(options, function(error, errorcode, insertedid, insertedscore) {
            if(error) {
                return callback(error + " (api.leaderboards.saveAndList:232)", errorcode);
            }
            
            var query = {
                table: options.table
            };

            if(options.excludeplayerid !== true && options.playerid) {
                query.playerid = options.playerid;
            }
            
            if(options.fields && Object.keys(options.fields).length > 0) {
                query.fields = options.fields;
            }
            
            if(options.hasOwnProperty("global")) {
                query.global = options.global;
            }
            
            if(options.hasOwnProperty("source")) {
                query.source = options.source;
            }
            
            // find the offset
            rank(query, options.highest, options.points, function(error, errorcode, before) {
                if(error) {
                    return callback(error + " (api.leaderboards.saveAndList:240)", errorcode);
                }
                // prepare our query for listing
                query.publickey = options.publickey;
                query.perpage = options.perpage;
                query.page = Math.floor(before / options.perpage) + 1;
                query.highest = options.lowest !== true;
                query.lowest = !query.highest;
                delete(query.points);
                leaderboards.list(query, function(error, errorcode, numscores, scores) {
                    
                        if(scores && scores.length) {
                        for(var i=0, len=scores.length; i<len; i++) {
                            if(scores[i].points == options.points && 
                               scores[i].playerid == options.playerid &&
                               scores[i].playername == options.playername &&
                               scores[i].source == options.source) {
                                   scores[i].submitted = true;
                                   break;
                               }
                        }
                    }
                    
                    return callback(error, errorcode, numscores, scores);
                });
            });
        });
    }
};

/**
 * Strips unnceessary data and tidies a score object
 */
function clean(scores, baserank) {
    var i, len, x, score, 
        results = [];
    
    for(i=0, len=scores.length; i<len; i++) {
        score = scores[i].toObject();
        
        for(x in score) {
            if(typeof(score[x]) == "string") {
                score[x] = utils.unescape(score[x]);
            }
        }

        for(x in score.fields) {
            if(typeof(score.fields[x]) == "string") {
                score.fields[x] = utils.unescape(score.fields[x]);
            }
        }

        score.rank = baserank + i;
        score.scoreid = score._id.toString();
		score.rdate = utils.friendlyDate(utils.fromTimestamp(score.date));
        delete score._id;
        delete score.__v;
        delete score.hash;
        results.push(score);
    }
    return results;
}


// indexes provide a way to skip expensive mongodb count operations by tracking
// the rank position of points for specific leaderboard queries
 
var indexlist = [];
var index = {};/*
    hash: {
        hash: hash,
        query: query,
        highest: highest,
        scores: [ { points: 1000, scores: 7 }, { points: 989, scores: 1}],
        remove: [ { points: 1000, 3 } ],
        lastupdated: timestamp,
        lastused: timestamp
}*/


/*
 * Gets the rank of the provided points based on its query either from an existing
 * index, or manually while it creates a new index
 */
function rank(query, highest, points, callback) {

    var hash = md5(JSON.stringify(query) + "." + highest),
        newscore = { points: points, scores: 1, before: 0 },
        ind = index[hash];

    if(ind) {
        
        ind.lastused = datetime.now;
        if(ind.removeHash[points]) {
            return callback(null, errorcodes.NoError, ind.removeHash[points].before);
        }
        
        addToIndex(index, highest, newscore, function(o) {
            return callback(null, newscore.before);    
        });
    } 

    // set up our new index and chek against the database
    index[hash] = { 
        key: hash, 
        query: query,
        highest: highest,
        scores: [newscore],
        remove: [newscore],
        removeHash: {},
        lastupdated: 0,
        lastused: datetime.now
    };
    
    indexlist.push(index[hash]); 
    indexlist.sort(function(a, b) { // todo: this could be better
        return a.lastupdated < b.lastupdated ? 1 : -1;
    });
    
    query.points = highest ? { $gte: points } : { $lte: points };
    db.LeaderboardScore.count(query, function(error, numscores) { 
        return callback(error, error ? errorcodes.GeneralError : errorcodes.NoError, numscores);
    });
}

// asynchronously puts a new score in an index
function addToIndex(index, highest, newscore, callback) {
    var ai, i, len,
        found = false;
        
    function nextBlock() {
        len = i + 1000;
        if(len >= index.scores.length) {
            len = index.scores.length;
        }
        
        if(i >= len) {
            return callback(newscore);
        }
        
        for(i=i; i<len; i++) {
            ai = index.scores[i];
            
            // update the scores after us to have one more 'before'
            if(found) {
                ai.before++;
                continue;
            }
            
            // count the number of scores higher or lower depending on setting
            found = (highest && ai.points > newscore.points) || (!highest && ai.points < newscore.points);
            
            if(!found) {
                newscore.before += ai.scores;
                continue;
            }
            
            // insert our new score
            index.scores.splice(i, 0, newscore);
            index.remove.push(newscore);
            index.removeHash[newscore.points] = newscore;
       }
       
       return setTimeout(nextBlock, 100);
    }
    
    nextBlock();
}

// keep our indexes up to date
function refreshIndexes() {

    if (!indexlist.length) {
        return setTimeout(refreshIndexes, 1000);
    }
    
    var first = indexlist.shift();
    
    // dispose of indexes not used in the last 10 minutes
    if(first.lastused < datetime.now - 600) { 
        index[first.hash] = null;
        delete(index[first.hash]);
        first = null;
        return refreshIndexes();
    }
    
    indexlist.push(first);
    
    // wait at least 30 seconds between updates
    if(datetime.now - first.lastcheck < 30) {
        return setTimeout(refreshIndexes, 1000);
    }
    
    // remove any scores we locally added
    var i, len, rem;
   
    for(i=0, len=first.remove.length; i<len; i++) {
       rem = first.remove[i];
       first.removeHash[rem.points] -= rem.scores;
    }
    
    // update the index
    first.query.date = { $gt: first.lastupdated };
    first.lastupdated = datetime.now;
    db.LeaderboardScore.find(first.query).sort(first.highest ? "-points" : "points").select("points date").exec(function(error, scores) {
        
        if(error) {
            return setTimeout(refreshIndexes, 1000);
        }
        
        if(!scores.length) {
            return setTimeout(refreshIndexes, 1000);
        }
        
        // add the new data
        var i, len, score;
        for(i=0, len=scores.length; i<len; i++)  {
            score = scores[i];
            
            var newscore = { points: score.points, scores: 1, before: 0 };
            addToIndex(first, first.highest, newscore);
            
            if(score.date > first.lastupdated) {
                first.lastupdated = score.date;
            }
        }

        return setTimeout(refreshIndexes, 1000);
    });
}

refreshIndexes();
