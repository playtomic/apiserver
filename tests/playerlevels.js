var db = require(__dirname + "/../api/database.js"),
    assert = require("assert"),
    testgame = require(__dirname + "/testgame.js"),
    errorcodes = require(__dirname + "/../api/errorcodes.js").errorcodes,
    forceAggregation = require(__dirname + "/../api/playerlevels.js").forceAggregation,
    v1 = require(__dirname + "/../v1/playerlevels.js");

describe("playerlevels", function() {
	
    beforeEach(function(done) {

		// wait for db setup to complete
		function dbready() {
			if(!db.ready) {
				return setTimeout(dbready, 100);
			}
			
			done();
		}
		
		dbready();
    });

    var level;

    it("Save levels", function(done) {

        var payload = {
            publickey: testgame.publickey,
            global: true,
            source: "localhost",
            name: "test level " + Math.random(),
            username: "ben " + Math.random(),
            playerid: 1,
            fields: {},
            data: "sample data" // the level data
        };

        v1.save(payload, testgame.request, testgame.response, function(error, output) {

            assert.equal(error, null);
            assert.notEqual(output, null);

            var json;

            try {
                json = JSON.parse(output);
            } catch(s) {

            }

            assert.notEqual(json, null);
            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            assert.notEqual(json.level.levelid, null);
            assert.equal(json.level.data, "sample data");
            level = json.level;

            // make sure we can't re-save with the same info
            v1.save(payload, testgame.request, testgame.response, function(error, output) {

                assert.notEqual(output, null);
                
                var json;
                
                try {
                    json = JSON.parse(output);
                } catch(s) {
                }
                
                assert.equal(json.errorcode, errorcodes.LevelAlreadyExists);
                
                done();
            });
        });
    });

    it("Rate the level", function(done) {

        var payload = {
            publickey: testgame.publickey,
            levelid: level.levelid,
            rating: 7
        };

       v1.rate(payload, testgame.request, testgame.response, function(error, output) {

           assert.equal(error, null);
           assert.notEqual(output, null);

           var json;

           try {
               json = JSON.parse(output);
           } catch(s) {
           }

           assert.notEqual(json, null);
           
           // try again to trigger the error
           v1.rate(payload, testgame.request, testgame.response, function(error, output) {
               assert.notEqual(error, null);
             
               // now make some extra rating data so we can look at 
               // the last100 and non-aggregated votes
             
               payload.allowduplicates = true; // TODO: document this in api clients
               payload.rating = 1;
             
               v1.rate(payload, testgame.request, testgame.response, function(error, output) {
                    assert.equal(error, null);
                    
                    // do a second vote with the same score
                    v1.rate(payload, testgame.request, testgame.response, function(error, output) {
                       assert.equal(error, null);
                       
                       // test the 'last100' truncates correctly
                       var counter = 0;
                       
                       function nextDate() {
                           
                            if(counter > 0 && counter % 10 === 0 && payload.rating < 10)
                            {
                                payload.rating++;
                            }
                           
                            var d = new Date();
                            d.setDate(d.getDate() - counter);
                            counter++;
                            payload.overridedate = d.getUTCFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate();
    
                            v1.rate(payload, testgame.request, testgame.response, function(error, output) {
                             
                                assert.equal(error, null);
                                 
                                if(counter < 150) {
                                    nextDate();
                                    return;
                                }
                                   
                                // test that we are only storing the last 100 individual votes
                                db.playtomic.playerlevel_levels.get({_id: payload.levelid}, function(error, tlevels) {
                                
                                    assert.notEqual(tlevels, null);
                                    assert.equal(tlevels.length, 1);
                                    
                                    level = tlevels[0];
                                    level.levelid = level._id.toString();
                                    delete(level._id);
                                    
                                    assert.notEqual(level.ratings, null);
                                    assert.notEqual(level.ratingslast100, null);
                                    assert.equal(level.ratingslast100.length, 100);
                                    
                                    // test the daily vote data is being truncated
                                    assert.equal(Object.keys(level.ratings).length, 100);
                                    
                                    // prepare the aggregation
                                    forceAggregation(done);
                                    
                                    // TODO: tests for the new sorting methods
                                    

                                });
                            });
                        }
                           
                        nextDate();
                        return;
                    });
                });
            });
        });
    });

    it("Load a level", function(done) {
        
        var payload = {
            publickey: testgame.publickey,
            levelid: level.levelid
        };
        
        v1.load(payload, testgame.request, testgame.response, function(error, output) {
            
            assert.equal(error, null);
            assert.notEqual(output, null);
            
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }

            assert.notEqual(json, null);
            var x;
            
            for(x in level) {
                
                // TODO: needs a better check against objects
                if((!x instanceof String && !x instanceof Number && !x instanceof Date) || x === "fields" || x == "hash" || x == "ratingaverages" || !json.level[x]) {
                    continue;
                }
            
                assert.equal(json.level[x], level[x]);
            }

            for(x in level.fields) {
                assert.equal(json.level.fields[x], level.fields[x]);
            }
            
            done();
        });
    });

    // TODO: this was originally through the analytics service & processing
    //it("Flag, rate, play, start, finish a level", function(done) {
    //    done();
    //});

    it("Get popular levels", function(done) {

        var payload = {
            publickey: testgame.publickey,
            mode: "popular",
            page: 1,
            perpage: 10
        };

        v1.list(payload, testgame.request, testgame.response, function(error, output) {
            
            assert.equal(error, null);
            assert.notEqual(output, null);
            
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            done();
        });
    });

    it("Get unpopular levels", function(done) {
        
        var payload = {
            publickey: testgame.publickey,
            mode: "newest",
            page: 1,
            perpage: 10
        };
        
        v1.list(payload, testgame.request, testgame.response, function(error, output) {
            
            assert.equal(error, null);
            assert.notEqual(output, null);
            
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            done();
        });
    });
});
