var testgame = require(__dirname + "/testgame.js"),
    games = require(__dirname + "/../api/games.js"),
    leaderboards = require(__dirname + "/../api/leaderboards.js"),
    db = require(__dirname + "/../api/database.js"),
    v1 = require(__dirname + "/../v1/leaderboards.js"),
    assert = require("assert");

describe("leaderboards", function() {

    var populated = 0;
    var names = ["fred", "harry", "michael", "sally", "peter", "michelle", "jules", "alicia", "robert", "paul"].sort();
    var ids = [1,2,3,4,5,6,7,8,9,10];

    
    // create the test data
    beforeEach(function(done) {
        
        if(names.length == 0) {
            return done();
        }

        var score = {
            publickey: testgame.publickey,
            source: "localhost",
            name: null,
            points: 0,
            playerid: "",
            fields: {}
        };

        db.playtomic.leaderboard_scores.remove({filter: {publickey: testgame.publickey}}, function(error) {
            if(error) {
                throw(error);
            }
            db.playtomic.leaderboard_bans.remove({filter: {publickey: testgame.publickey}}, function(error) {
                if(error) {
                    throw(error);
                }
                nextScore();
            });
        });

        function nextScore() {

            // high score
            delete(score._id);
            score.name = names.pop();
            score.playerid = ids.pop();
            score.points = names.length * 1000;
            score.table = "scores";

            leaderboards.save(score, function(error, item){
                populated++;

                if(names.length > 0) {
                    return nextScore();
                } else {
                    return done();
                }
            });
        }
    });

    it("Get highest 10 scores", function(done) {

        leaderboards.list({
                                table: "scores",
                                highest: true,
                                perpage: 10,
                                page: 1,
                                global: true,
                                publickey: testgame.publickey
                            }, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores > 0, true);
            assert.equal(scores.length > 0, true);
            assert.equal(scores[0].name, "sally");
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
            assert.equal(scores[0].name, "alicia");

            // test the caching
            leaderboards.list(options, function(error, errorcode, numscores, scores) {

                for(var i=0; i<scores.length; i++) {
                    assert.equal(scores[i].name, oldscores[i].name);
                }

                done();
            });
        });
    });
        
    it("Get lowest with filters", function(done) {
        leaderboards.list({
                                table: "scores",
                                lowest: true,
                                perpage: 10,
                                page: 1,
                                global: true,
                                publickey: testgame.publickey
                            }, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores > 0, true);
            assert.equal(scores.length > 0, true);
            assert.equal(scores[0].name, "alicia");
            done();
        });
    });
    
    it("Get highest with friend filter", function(done) {
        leaderboards.list({
                                table: "scores",
                                highest: true,
                                perpage: 10,
                                page: 1,
                                global: true,
                                publickey: testgame.publickey,
                                friendslist: [1, 2, 3, 4]
                            }, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 4);
            assert.equal(scores.length, 4);
            assert.equal(scores[0].name, "jules");
            done();
        });
    });

    it("SaveAndList a new low score", function(done) {

        leaderboards.saveAndList({

                                    // save params
                                    source: "localhost",
                                    points: 10000,
                                    playerid: "",
                                    fields: {},
                                    name: "ben",

                                    // list params
                                    table: "scores",
                                    highest: true,
                                    perpage: 1,
                                    global: true,
                                    publickey: testgame.publickey


                                }, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 11);
            assert.equal(scores.length, 1);
            assert.equal(scores[0].points, 10000);
            assert.equal(scores[0].name, "ben");
            done();
        });
    });

    it("SaveAndList a new high score", function(done) {
        leaderboards.saveAndList({

            // save params
            source: "localhost",
            points: 12000,
            playerid: "1",
            fields: {
                age: 1
            },
            name: "isabella",

            // list params
            table: "scores",
            highest: true,
            perpage: 10,
            global: true,
            publickey: testgame.publickey,
            filters: {
                age: 1
            }
        }, function(error, errorcode, numscores, scores) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
            assert.equal(numscores, 1);
            assert.equal(scores.length, 1);

            // one of the scores should be the saved one
            for(var i=0; i<10; i++) {

                if(scores[i].name == "isabella") {
                    assert.equal(scores[i].points, 12000);
                    assert.equal(scores[i].fields.age, 1);
                    assert.equal(scores[i].name, "isabella");
                    done();
                    return;
                }
            }

            assert.equal()
            done();
        });
    });

    it("V1 JSON structure (list)", function(done) {

        var payload = {
            publickey: testgame.publickey,
            table: "scores",
            highest: true,
            global: true,
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
            assert.equal(json.numscores, 12);
            assert.equal(json.success, true);
            assert.equal(json.scores.length <= payload.perpage, true);
            assert.equal(json.scores.length, 2);
            assert.equal(json.scores[1].rank, 12);
            done();
        });
    });

    it("V1 JSON structure (save)", function(done) {

        var payload = {
            publickey: testgame.publickey,
            source: "localhost",
            name: "dummy",
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
            playerid: 1,
            fields: {
                age: 1
            },
            name: "isabella",

            // list params
            table: "scores",
            highest: true,
            perpage: 7,
            excludeplayerid: true,
            publickey: testgame.publickey
        };

        v1.saveAndList(payload, testgame.request, testgame.response, function(error, output) {

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
            assert.equal(json.numscores, 14);
            done();
        });
    });
});
