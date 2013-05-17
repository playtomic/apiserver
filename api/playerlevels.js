var config = require(__dirname + "/config.js"),
    db = require(__dirname + "/database.js"),
    mongodb = require("mongodb"),
    mdouble = mongodb.BSONPure.Double,
    objectid = mongodb.BSONPure.ObjectID,
    md5 = require(__dirname + "/md5.js"),
    utils = require(__dirname + "/utils.js"),
    date = utils.fromTimestamp,
    datetime = require(__dirname + "/datetime.js"),
    errorcodes = require(__dirname + "/errorcodes.js").errorcodes;

var playerlevels = module.exports = {

    list:function (options, callback) {

        var query = {

            filter: {
                publickey: options.publickey
            },
            limit: parseInt((options.perpage || "20").toString()),
            skip: ((options.page - 1) * options.perpage),
            sort: {},
            cache: false,
            cachetime: 120
        };

        for(var key in options.filters) {
            query.filter["fields." + key] = options.filters[key];
        }

        if(options.mode != "newest") {
            var datemin = options.datemin;
            var datemax = options.datemax;

            if(datemin && datemax) {
                query.filter["$and"] = [{date: {$gte: utils.toTimestamp(datemin)}}, {date: {$gte: utils.toTimestamp(datemax)}}];
            }

            query.sort = {"rating": -1};
        } else {
            query.sort = {"date": -1};
        }

        // per-source website or device achievements, websites
		// get truncated to domain.com
        if(options.source) {
            query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
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

        db.playtomic.playerlevel_levels.getAndCount(query, function(error, levels, numlevels){
            
            if (error) {
                return callback("unable to load levels (api.playerlevels.list:65)", errorcodes.GeneralError);
            }

            return callback(null, errorcodes.NoError, numlevels, clean(levels, options.data));
        });
    },

    load: function(options, callback) {

        if(!options.levelid) {
            return callback("unable to load levels (api.playerlevels.load:86)", errorcodes.GeneralError);
        }

        var query = {

            filter: {
                _id: new objectid(options.levelid)
            },

            limit: 1,
            skip: 0,
            sort: {},
            cache: true,
            cachetime: 120
        };

        db.playtomic.playerlevel_levels.get(query, function(error, levels){
            
            if (error) {
                return callback("error loading level (api.playerlevels.load:96)", errorcodes.GeneralError);
            }

            if (!levels || levels.length == 0) {
                return callback("unable to find level (api.playerlevels.load:102)", errorcodes.GeneralError);
            }

            return callback(null, errorcodes.NoError, clean(levels, true)[0]);
        });
    },

    rate: function(options, callback) {

        if(!options.levelid) {
            return callback("missing id", errorcodes.NoLevelId);
        }

        var hash = md5(options.ip + "." + options.levelid);

        if(ratings.check(hash)) {
            return callback("already rated (api.playerlevels.rate:137)", errorcodes.AlreadyRated);
        }

        var rating = parseInt(options.rating.toString());

        if(!rating || rating < 1 || rating > 10) {
            return callback("invalid rating (1 - 10) (api.playerlevels.rate:133)", errorcodes.InvalidRating);
        }

        var command = {
            filter: {
                _id: new objectid(options.levelid)
            },
            doc: {
                $inc: {score: rating, votes: 1}
            },
            upsert: false,
            safe: true
        };

        db.playtomic.playerlevel_levels.update(command, function(error) {

            if(error) {
                return callback(error, errorcodes.GeneralError);
            }

            ratings.add(hash);
            return callback(null, errorcodes.NoError);
        });
    },

    save: function(options, callback) {

        if(!options.name) {
            callback("missing name (api.playerlevels.save:168)", errorcodes.NoLevelName);
            return;
        }
		
		if(!options.source) {
			options.source = "";
		} else {
			options.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
		}

        // small cleanup
        var level = {};

        // fields that just aren't relevant, by doing it this way it's easier to extend because you can
        // just add more fields directly in your game and they will end up in your scores and returned
        // to your game
        var exclude = ["section", "action", "ip", "date", "url", "page", "perpage", "filters", "debug"];

        for(var x in options) {
            if(exclude.indexOf(x) > -1) {
                continue;
            }

            level[x] = options[x];
        }

		level.source = options.source;
        level.hash = md5(options.publickey + "." + options.ip + "." + options.name + "." + options.source);
        level.date = datetime.now;
        level.votes = 0;
        level.points = 0;

        // check for dupes
        db.playtomic.playerlevel_levels.get({ filter: { publickey: level.publickey, hash: level.hash }, limit: 1}, function(error, levels) {

            if (error) {
                return callback("unable to save level (api.playerlevels.save:188)", errorcodes.GeneralError);
            }

            if(levels && levels.length > 0) {
                return callback("already saved this level", errorcodes.LevelAlreadyExists, clean(levels, options.data === true)[0]);
            }

            db.playtomic.playerlevel_levels.insert({doc: level, safe: true}, function(error, level) {
                if (error) {
                    return callback("unable to save level (api.playerlevels.save:188)", errorcodes.GeneralError);
                }

                return callback(null, errorcodes.NoError, clean([level], true)[0]);
            });
        });
    }
};

function clean(levels, data) {

    for(var i=0; i<levels.length; i++) {

        var level = levels[i];

        for(var x in level) {
            if(typeof(level[x]) == "String") {
                level[x] = utils.unescape(level[x]);
            }
        }

        for(var x in level.fields) {
            if(typeof(level.fields[x]) == "String") {
                level.fields[x] = utils.unescape(level.fields[x]);
            }
        }

        level.levelid = level._id;
		level.rdate = utils.friendlyDate(utils.fromTimestamp(level.date));
        delete level._id;
        delete level.hash;

        if(data !== true) {
            delete level.data;
        }
    }

    return levels;
}

// save recent ratings for up to 2 minutes
var cache = {};

var ratings = {

    add: function(hash) {
        cache[hash] = 60;
    },

    check: function(hash) {
        return cache[hash] != null;
    },

    cleanup: setInterval(function() {

        var now = datetime.now;

        for(var hash in cache) {
            cache[hash]--;

            if(cache[hash] > 0) {
                continue;
            }

            delete cache[hash];
        }
    }, 5000)
};