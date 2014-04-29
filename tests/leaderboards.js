var testgame = require(__dirname + "/testgame.js"),
    leaderboards = require(__dirname + "/../api/leaderboards.js"),
    v1 = require(__dirname + "/../v1/leaderboards.js"),
    assert = require("assert");

describe("leaderboards", function() {

    it("Get highest 10 scores", function(done) {
		
		var options = {
            table: "scores",
            highest: true,
            perpage: 10,
            page: 1,
            global: true,
            publickey: testgame.publickey
        };

        leaderboards.list(options, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores > 0, true);
            assert.equal(scores.length > 0, true);
            assert.equal(scores[0].playername, "sally");
            done();
        });
    });
    
    it("Get lowest 10 scores", function(done) {
        var options = {
            table: "scores",
            lowest: true,
            perpage: 10,
            page: 1,
            global: true,
            publickey: testgame.publickey
        };

        leaderboards.list(options, function(error, errorcode, numscores, scores) {
            var oldscores = scores;
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores > 0, true);
            assert.equal(scores.length > 0, true);
            assert.equal(scores[0].playername, "alicia");

            // test the caching
            leaderboards.list(options, function(error, errorcode, numscores, scores) {

                for(var i=0; i<scores.length; i++) {
                    assert.equal(scores[i].playername, oldscores[i].playername);
                }

                done();
            });
        });
    });
        
    it("Get lowest with filters", function(done) {
		var options = {
			table: "scores",
            lowest: true,
            perpage: 10,
            page: 1,
            publickey: testgame.publickey
		};
			
        leaderboards.list(options, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores > 0, true);
            assert.equal(scores.length > 0, true);
            assert.equal(scores[0].playername, "alicia");
            done();
        });
    });
    
    it("Get highest with friend filter", function(done) {
		var options = {
            table: "scores",
            highest: true,
            perpage: 10,
            page: 1,
            publickey: testgame.publickey,
            friendslist: ["1", "2", "3", "4"]
        };
		
        leaderboards.list(options, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 4);
            assert.equal(scores.length, 4);
            assert.equal(scores[0].playername, "jules");
            assert.equal(scores[0].rank, 1);
            done();
        });
    });

    it("SaveAndList a new low score", function(done) {
		
		var options = {
            // save params
            source: "localhost",
            points: 10000,
            playerid: "1",
            fields: {},
            playername: "ben",
            // list params
            table: "scores",
            lowest: true,
            perpage: 2,
            publickey: testgame.publickey
        };

        leaderboards.saveAndList(options, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 2);
            assert.equal(scores.length, 2);
            assert.equal(scores[0].points, 10000);
            assert.equal(scores[0].playername, "ben");
            assert.equal(scores[0].rank, 1);
            done();
        });
    });
	
    it("SaveAndList a new high score", function(done) {
		
		var options = {

            // save params
            source: "localhost",
            points: 12000,
            playerid: "11",
            fields: {
                age: 1
            },
            playername: "isabella",

            // list params
            table: "scores",
            highest: true,
            perpage: 10,
            publickey: testgame.publickey,
            filters: {
                age: 1
            }
        };
		
        leaderboards.saveAndList(options, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 1);
            assert.equal(scores.length, 1);

            // one of the scores should be the saved one
            for(var i=0; i<10; i++) {

                if(scores[i].playername == "isabella") {
                    assert.equal(scores[i].points, 12000);
                    assert.equal(scores[i].fields.age, 1);
                    assert.equal(scores[i].playername, "isabella");
                    done();
					return;
                }
            }
			
			assert.equal(1, 2);
			done();
        });
    });
	
	it("List ranks match saveAndList", function(done) {
		
		var options = {
            // save params
            source: "localhost",
            points: 26500,
            playername: "random " + Math.random(),
			allowduplicates: true,
            // list params
            table: "scores",
			highest: true,
            perpage: 3,
            publickey: testgame.publickey
        };

        leaderboards.saveAndList(options, function(error, errorcode, numscores, scores) {
			
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 13);
			assert.equal(scores.length, 3);			
			assert.equal(scores[0].rank, 4);
			assert.equal(scores[1].rank, 5);
			assert.equal(scores[1].submitted, true);
			assert.equal(scores[2].rank, 6);

			options = {
                table: "scores",
                highest: true,
                perpage: 20,
                publickey: testgame.publickey
			};
							
			leaderboards.list(options, function(error2, errorcode2, numscores2, scores2) {
								
                assert.equal(error2, null);
                assert.equal(errorcode2, 0);
                assert.equal(numscores, numscores2);
                assert.equal(scores2.length, 13);
                
				// confirm the 3 scores we returned before match and are
				// really in the right rank and positions
				for(var i=3; i<6; i++)
				{
					assert.equal(scores[i - 3].scoreid, scores2[i].scoreid);
					assert.equal(scores[i - 3].rank, scores2[i].rank);
					assert.equal(scores[i - 3].playername, scores2[i].playername);
					assert.equal(scores[i - 3].points, scores2[i].points);
				}
				
				done();
			});        
        });
	});

    it("V1 JSON structure (list)", function(done) {
        
        var payload = {
            publickey: testgame.publickey,
            table: "scores",
            highest: true,
            mode: "newest",
            page: 3,
            perpage: 5,
            filters: {}
        };

        v1.list(payload, testgame.request, testgame.response, function(error, output) {
            
            assert.notEqual(output, null);
            
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
                
            }
            
            assert.notEqual(json, null);
            assert.equal(json.numscores, 13);
            assert.equal(json.success, true);
            assert.equal(json.scores.length <= payload.perpage, true);
            assert.equal(json.scores.length, 3);
            assert.equal(json.scores[1].rank, 12);
            done();
        });
    });

    it("V1 JSON structure (save)", function(done) {

        var payload = {
            publickey: testgame.publickey,
            source: "localhost",
            playername: "dummy",
            points: 10,
            table: "scores",
            fields: {}
        };

        v1.save(payload, testgame.request, testgame.response, function(error, output) {
            
            assert.notEqual(output, null);
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            
            // don't overwrite
            payload.points = 9;
            
            v1.save(payload, testgame.request, testgame.response, function(error, output) {
                
                assert.notEqual(output, null);
                var json;
                
                try {
                    json = JSON.parse(output);
                } catch(s) {
                }
                
                assert.notEqual(json, null);
                assert.equal(json.errorcode, 209);
                assert.equal(json.success, true);
                
                // do overwrite
                payload.allowduplicates = true;
                
                v1.save(payload, testgame.request, testgame.response, function(error, output) {
                    
                    assert.notEqual(output, null);
                    var json;
                    
                    try {
                        json = JSON.parse(output);
                    } catch(s) {
                    }
                    
                    assert.notEqual(json, null);
                    assert.equal(json.errorcode, 0);
                    assert.equal(json.success, true);
                    done();
                });
            });
        });
    });

    it("V1 JSON structure (saveandlist)", function(done) {

        var payload = {
            // save params
            source: "localhost",
            points: 12000,
            playerid: "11",
            fields: {
                age: 1
            },
            playername: "isabella",
            
            // list params
            table: "scores",
            highest: true,
            perpage: 7,
            excludeplayerid: true,
            publickey: testgame.publickey,
        };

        v1.saveandlist(payload, testgame.request, testgame.response, function(error, output) {
			
            assert.notEqual(output, null);
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            assert.equal(json.scores.length, 7);
            assert.equal(json.numscores, 15);
            done();
        });
    });
});
