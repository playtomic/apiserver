var assert = require("assert"),
    db = require(__dirname + "/../api/database.js"),
    testgame = require(__dirname + "/testgame.js"),
    errorcodes = require(__dirname + "/../api/errorcodes.js").errorcodes,
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
           level.score = 7;
           level.votes = 1;
           
           v1.rate(payload, testgame.request, testgame.response, function(error, output) {
               assert.notEqual(error, null);
               done();
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

            for(var x in level) {
                if(x == "fields") {
                    continue;
                }

                assert.equal(json.level[x], level[x]);
            }

            for(var x in level.fields) {
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