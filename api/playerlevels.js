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
            fields: "-ratings -ratingslast100 -lastaggregated" + (options.data !== true ? " -data" : ""),
            limit: parseInt((options.perpage || "20"), 10),
            skip: ((options.page - 1) * options.perpage),
            sort: {}
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
                  query.sort = "-rating";
                  break;
                  
                case "recentaverage":
                  query.sort = "-ratingslast100average";
                  break;
                  
                case "todayaverage":
                case "yesterdayaverage":
                case "last7daysaverage":
                case "last30daysaverage":
                case "last90daysaverage":
                    query.sort = {};
                    query.sort = "-ratingaverages." + options.mode;
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
        
        db.PlayerLevel.find(query.filter).select(query.fields).sort(query.sort).limit(query.limit).skip(query.skip).exec(function(error, levels){
            if (error) {
                return callback("unable to load levels (api.playerlevels.list:93)", errorcodes.GeneralError);
            }
            
            db.PlayerLevel.count(query.filter, function(error, numlevels) {
                if (error) {
                    return callback("unable to load levels (api.playerlevels.list:98)", errorcodes.GeneralError);
                }
                
                return callback(null, errorcodes.NoError, numlevels, clean(levels, options.data));
            });
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
        
        db.PlayerLevel.findOne(query.filter).select("-ratings -ratingslast100 -lastaggregated").exec(function(error, level){
            if (error) {
                return callback("error loading level (api.playerlevels.load:96)", errorcodes.GeneralError);
            }
            
            if (!level) {
                return callback("unable to find level (api.playerlevels.load:102)", errorcodes.GeneralError);
            }
            
            return callback(null, errorcodes.NoError, clean([level], true)[0]);
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
        
        db.PlayerLevel.findOneAndUpdate({_id: options.levelid}, { $inc: { score: rating, votes: 1 }}, { upsert: false }, function(error) {
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
            
            db.PlayerLevel.findOne({ _id: options.levelid }).exec(function(error, docdata) {
              if(error) {
                return callback(error, errorcodes.GeneralError);
              }
              
              var doc = docdata.toObject();
              var i, len;
              
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
                for(i=0, len=dkeys.length; i<len; i++) {
                  sorted.push(dkeys[i]);
                }
                
                sorted.sort(function(a, b) {
                    var d1 = new Date(a);
                    var d2 = new Date(b);
                    return d1 > d2 ? -1 : 1;
                });
                
                for(i=100, len=sorted.length; i<len; i++) {
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
              for(i=0, len=doc.ratingslast100.length; i<len; i++) {
                sum += doc.ratingslast100[i];
              }
              
              doc.ratingslast100average = sum / doc.ratingslast100.length;
            
              db.PlayerLevel.findOneAndUpdate({_id: doc._id}, doc, { upsert: false }, function(error) {
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
		
		if(options.source) {
			options.source = utils.baseurl(options.source);
		}
		
        // small cleanup
        var level = {};
        
        // fields we can ignore form new scores
        var exclude = ["section", "action", "ip", "date", "url", "page", "perpage", "filters", "debug"];
        
        for(var x in options) {
            if(exclude.indexOf(x) > -1) {
                continue;
            }
            level[x] = options[x];
        }
        
        level.source = options.source;
        level.hash = md5(options.publickey + "." + options.ip + "." + options.name + "." + (options.source || ""));
        level.publickey = options.publickey;
        
        // check for dupes
        db.PlayerLevel.findOne({ publickey: level.publickey, hash: level["hash"] }).exec(function(error, existing) {
            if (error) {
                return callback("unable to save level (api.playerlevels.save:188)", errorcodes.GeneralError);
            }
            
            if(existing) {
                return callback(null, errorcodes.LevelAlreadyExists);
            }
            
            var newlevel = new db.PlayerLevel(level);
            for(var x in level) {
                newlevel[x] = level[x];
            }

            newlevel.save(function(error) {
                level.levelid = newlevel._id;
                return callback(null, errorcodes.NoError, level);
            });
        });
    },
    
    // hook for testing to trigger the rating aggregation immediately
    forceAggregation: function(callback) {
        aggregateRatings(callback);
    }
};

/**
 * periodically aggregates the best levels from today/yesterday, this/last week, this/last month
 */
if(!process.env.testing) {
    setTimeout(aggregateRatings, 5000);
}

function aggregateRatings(callback) {
    
    var query = { 
        votes: { $gte: 1 },
        $or: [
            { lastaggregated: { $lte: datetime.now } },
            { lastaggregated: { $exists: false } }
        ]
    };
     
    db.PlayerLevel.find(query).select("ratings").sort("lastaggregated").limit(1000).exec(function(error, levels) {
        
        if(error) {
            console.log("error finding levels to aggregate", error);
            return setTimeout(aggregateRatings, 1000);
        }
         
        var dtoday = dateArray(0)[0],
            dyesterday = dateArray(1)[0],
            dlast7days = dateArray(7),
            dlast30days = dateArray(30),
            dlast90days = dateArray(90),
            ratingaverages = {},
            sum,
            count,
            j;
            
        function nextLevel() { 
            if(levels.length === 0) {
                
                if(callback) {
                    callback();
                }
                return setTimeout(aggregateRatings, 5 * 60 * 1000);
            }   
            
            var level = levels.shift();
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
            ratingaverages.today = averages[dtoday] || 0;
            ratingaverages.yesterday = averages[dyesterday] || 0;
            ratingaverages.last7days = calculateAverage(averages, dlast7days);
            ratingaverages.last30days = calculateAverage(averages, dlast30days);
            ratingaverages.last90days = calculateAverage(averages, dlast90days);
            
            // update
            return db.PlayerLevel.findOneAndUpdate({_id: level._id}, { $set: { ratingaverages: ratingaverages, lastaggregated: datetime.now }}, { upsert: false }, function(error) {
               if(error) {
                    console.log("error updating level", error);
                    return setTimeout(aggregateRatings, 1000);
               } 
               return nextLevel();
           });
        }
        return nextLevel();
    });
}

/**
 * strips unnecessary data from a level object
 */
function clean(levels, data) {
    
    var results = [];

    for(var i=0; i<levels.length; i++) {
        
        var level = levels[i].toObject();
        var x;
        
        for(x in level) {
            if(typeof(level[x]) == "string") {
                level[x] = utils.unescape(level[x]);
            }
        }
        
        for(x in level.fields) {
            if(typeof(level.fields[x]) == "string") {
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
        
        results.push(level);
    }

    return results;
}

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