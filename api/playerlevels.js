var db = require(__dirname + "/database.js"),
    mongodb = require("mongodb"),
    objectid = mongodb.BSONPure.ObjectID,
    md5 = require(__dirname + "/md5.js"),
    utils = require(__dirname + "/utils.js"),
    datetime = require(__dirname + "/datetime.js"),
    errorcodes = require(__dirname + "/errorcodes.js").errorcodes;

module.exports = {

    list:function (options, callback) {
		
        // TODO: would be cool if you could pass vote and score min/maxes as filters
        var query = {
            filter: {
                publickey: options.publickey
            },
            fields: {
                ratings: 0,
                ratingslast100: 0,
                lastaggregated: 0,
                data: "data" in options ? (options.data ? 1 : 0) : 1
            },
            limit: parseInt((options.perpage || "20"), 10),
            skip: ((options.page - 1) * options.perpage),
            sort: {},
            cache: false,
            cachetime: 120
        };
        
        for(var key in options.filters) {
            query.filter["fields." + key] = options.filters[key];
        }
		
        options.mode = options.mode || "popular";
        options.mode = options.mode.toLowerCase();
        
        if(options.mode != "newest") {
            if(options.datemin && options.datemax) {
                query.filter.$and = [
                  { date: { $gte: utils.toTimestamp(options.datemin)}}, 
                  { date: { $gte: utils.toTimestamp(options.datemax)}}
                ];
            } else if(options.datemin) { // TODO: add tests for datemin and datemax by themselves
                query.filter.date =  { $gte: utils.toTimestamp(options.datemin) };
            } else if(options.datemax) {
                query.filter.date =  { $lte: utils.toTimestamp(options.datemax) };
            }
          
            switch(options.mode) {
                case "alltime":
                case "popular": // legacy
                  query.sort = { "rating": -1 };
                  break;
                  
                case "recentaverage":
                  query.sort = { "ratingslast100average": -1 };
                  break;
                  
                case "todayaverage":
                case "yesterdayaverage":
                case "last7daysaverage":
                case "last30daysaverage":
                case "last90daysaverage":
                    query.sort = {};
                    query.sort["ratingaverages." + options.mode] = -1; 
                    break;
            }
        } else {
            query.sort = {"date": -1};
        }
        
        // per-source website or device achievements, websites
        // get truncated to domain.com
        if(options.source) {
            query.filter.source = options.source.indexOf("://") > -1 ? utils.baseurl(options.source) : options.source;
        }
        
        // filtering for playerids
        var playerids = options.friendslist || [];
		
        if(options.playerid) {
            playerids.push(options.playerid);
        }
        
		if(playerids.length > 1) {
            query.filter.playerid = { $in: playerids };
        } else if(playerids.length == 1) {
            query.filter.playerid = playerids[0];
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
            fields: {
                ratings: 0,
                ratingslast100: 0,
                lastaggregated: 0
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
            
            if (!levels || !levels.length) {
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
        
        // although options technically allow duplicate votes it's only
        // been added for easier testing
        if(!options.allowduplicates && ratings.check(hash)) {
            return callback("already rated (api.playerlevels.rate:137)", errorcodes.AlreadyRated);
        }
        
        var rating = parseInt(options.rating.toString(), 10);
        
        if(!rating || rating < 1 || rating > 10) {
            return callback("invalid rating (1 - 10) (api.playerlevels.rate:133)", errorcodes.InvalidRating);
        }
      
        var ratingarray = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
        ratingarray[rating-1]++;
      
        var d = new Date();
        var datekey = d.getUTCFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate();
      
        // overrides just for testing
        if(options.overridedate) {
          datekey = options.overridedate;
        }
          
        var command = {
            filter: {
                _id: new objectid(options.levelid)
            },
            doc: {
                $inc: { score: rating, votes: 1 }
            },
            upsert: false,
            safe: true
        };
        
        db.playtomic.playerlevel_levels.update(command, function(error) {
            
            if(error) {
                return callback(error, errorcodes.GeneralError);
            }
            
            ratings.add(hash);
          
            // non-aggregated vote data
            command = {
                filter: {
                  _id: new objectid(options.levelid)
                },
                limit: 1
            };
          
            db.playtomic.playerlevel_levels.get(command, function(error, doc) {
              
              var i;
              
              if(error) {
                return callback(error, errorcodes.GeneralError);
              }
              
              if(doc.length) {
                doc = doc[0];
              }
              
              // last 100 days, this is used for precalculating popularity
              if(!doc.ratings) {            
                doc.ratings = {};
              } 
              
              if(!doc.ratings[datekey]) {
                  doc.ratings[datekey] = ratingarray;
              } else {                
                for(i=0; i<10; i++) {
                  doc.ratings[datekey][i] += ratingarray[i];
                }
              }
              
              // truncate excessive data
              var dkeys = Object.keys(doc.ratings);
              
              if(dkeys.length > 100) { 
                var sorted = [];
                for(i=0; i<dkeys.length; i++) {
                  sorted.push(dkeys[i]);
                }
                
                sorted.sort(function(a, b) {
                    var d1 = new Date(a);
                    var d2 = new Date(b);
                    return d1 > d2 ? -1 : 1;
                });
                
                for(i=100; i<sorted.length; i++) {
                  delete(doc.ratings[sorted[i]]);
                }
              }
              
              // last 100 votes
              if(!doc.ratingslast100) {
                doc.ratingslast100 = [];
              }
              
              doc.ratingslast100.push(rating);
              
              while(doc.ratingslast100.length > 100) {
                doc.ratingslast100.shift();
              }
              
              var sum = 0;
              for(i=0; i<doc.ratingslast100.length; i++) {
                sum += doc.ratingslast100[i];
              }
              
              doc.ratingslast100average = sum / doc.ratingslast100.length;
              
              // and update
              command = {
                  filter: {
                    _id: new objectid(options.levelid)
                  },
                  doc: doc,
                  upsert: false,
                  safe: true
              };
              
              db.playtomic.playerlevel_levels.update(command, function(error) {
                
                if(error) {
                  return callback(error, errorcodes.GeneralError);
                }
                
                return callback(null, errorcodes.NoError);
              });
            });
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
        level.score = 0;
        level.lastaggregated = 0;
        
        // check for dupes
        db.playtomic.playerlevel_levels.get({ filter: { publickey: level.publickey, hash: level.hash }, limit: 1}, function(error, levels) {
            
            if (error) {
                return callback("unable to save level (api.playerlevels.save:188)", errorcodes.GeneralError);
            }
            
            if(levels && levels.length) {
                return callback("already saved this level", errorcodes.LevelAlreadyExists, clean(levels, options.data === true)[0]);
            }
            
            db.playtomic.playerlevel_levels.insert({doc: level, safe: true}, function(error, level) {
                if (error) {
                    return callback("unable to save level (api.playerlevels.save:188)", errorcodes.GeneralError);
                }

                return callback(null, errorcodes.NoError, clean([level], true)[0]);
            });
        });
    },
    
    forceAggregation: function(callback) {
        prepareAggregation(callback);
    }
};

/**
 * periodically aggregates the best levels from today/yesterday, this/last week, this/last month
 */
 function prepareAggregation(callback) {
     
     var query = { 
        filter: {
            $exists: { "lastaggregated": -1 }
        },
        fields: { 
            _id: 1,
        },
        cache: false
    };
    
    db.playtomic.playerlevel_levels.get(query, function(error, results) {
       
       if(error) {
           return setTimeout(prepareAggregation, 1000);
        }
        
        results.forEach(function(level) {
            
            var command = {
                filter: {
                    _id: level._id
                },
                doc: {
                    $set: { 
                        lastaggregated: 0
                    }
                },
                upsert: false,
                safe: true
            };
            
            db.playtomic.playerlevel_levels.update(command, function(error) {
                if(error) {
                }
            });
        });
        
        return aggregateRatings(callback);
    });
}

if(!process.env.testing) {
    setTimeout(prepareAggregation, 5000);
}

function aggregateRatings(callback) {
    
    var query = { 
        filter: {
            votes: { $gte: 1 }
        },
        fields: { 
            _id: 1,
            ratings: 1
        },
        sort: { 
            lastaggregated: 1
        },
        limit: 2000,
        cache: false
    };
     
    db.playtomic.playerlevel_levels.get(query, function(error, items) {
        
        if(error) {
            return setTimeout(aggregateRatings, 5 * 60 * 1000);
        }
         
        var sum,
            count,
            j;
            
        // generates the date keys for a targeted period
        function dateArray(days) {
            var dates = [];
            var now = new Date();
            
            while(days > 0) {
                var d = new Date(now.getDate() - days);
                dates.push(d.getUTCFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate());
                
                if(days == 1)
                {
                    break;
                }
                
                days--;
            }
            
            return dates;
        }
        
        // calculates the average from a selection of dates
        function calculateAverage(data, daterange) {
            var sum = 0,
                count = 0;
                
            for(var i=0; i<daterange.length; i++) {
                var key = daterange[i];
                
                if(data[key]) {
                    sum += data[key];
                    count++;
                }
            }
            
            return count === 0 ? 0 : sum / count;
        }
         
        var dtoday = dateArray(0)[0];
        var dyesterday = dateArray(1)[0];
        var dlast7days = dateArray(7);
        var dlast30days = dateArray(30);
        var dlast90days = dateArray(90);
         
        // calculate the daily averages
        items.forEach(function(level) { 
            
            var averages = {};
             
            for(var date in level.ratings) {
                
                if(!level.ratings[date]) { 
                    continue;
                }
                 
                sum = 0;
                count = 0;
                
                for(j=0; j<10; j++) {
                    sum += (j+1) * level.ratings[date][j];
                    count += level.ratings[date][j];
                }
                
                averages[date] = count > 0 ? sum / count : 0;
            }
            
            // calculate the specific scores
            var ratingaverages = { 
                today: averages[dtoday] || 0,
                yesterday: averages[dyesterday] || 0,
                last7days: calculateAverage(averages, dlast7days),
                last30days: calculateAverage(averages, dlast30days),
                last90days: calculateAverage(averages, dlast90days)
            };
            
            // update
            var command = {
                filter: {
                    _id:  level._id
                },
                doc: {
                    $set: { 
                        ratingaverages: ratingaverages,
                        lastaggregated: datetime.now
                    }
                },
                upsert: false,
                safe: true
            };
            
            db.playtomic.playerlevel_levels.update(command, function(error) {
               if(error) {
                    return setTimeout(aggregateRatings, 5 * 60 * 1000);
               } 
           });
        });
        
        if(callback) {
            callback();
        }
        
        return setTimeout(aggregateRatings, 5 * 60 * 1000);
    });
}

/**
 * strips unnecessary data from a level object
 */
function clean(levels, data) {

    for(var i=0; i<levels.length; i++) {
        
        var level = levels[i],
            x;
            
        for(x in level) {
            if(typeof(level[x]) == "String") {
                level[x] = utils.unescape(level[x]);
            }
        }
        
        for(x in level.fields) {
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

// save recent ratings for up to 5 minutes
var cache = {},
    ratings = {
        
    add: function(hash) {
        cache[hash] = 60;
    },

    check: function(hash) {
        return hash in cache;
    },

    cleanup: setInterval(function() {
        
        for(var hash in cache) {
            cache[hash]--;
            
            if(cache[hash]) {
                continue;
            }
            
            delete cache[hash];
        }
    }, 5000)
};
