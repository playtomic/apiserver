var testgame = require(__dirname + "/testgame.js"),
    games = require(__dirname + "/../api/games.js"),
    gamevars = require(__dirname + "/../api/gamevars.js"),
    v1 = require(__dirname + "/../v1/gamevars.js"),
    assert = require("assert");

describe("gamevars", function() {
    
    var gvdata = null;
    var testdata = null;
    
    // wait for the gamevars to load
    beforeEach(function(done) {

        if(gvdata) {
            return done();
        }
		
		// wait for db setup to complete
		function dbready() {
			if(!db.ready) {
				return setTimeout(dbready, 100);
			}
			
			// wait for the gamevars cache to reload
			gamevars.ready = false;
		
	        function gamevarsready() {
			
	            if(!gamevars.ready) {
	                return setTimeout(gamevarsready, 100);
	            }
			
				gvdata = gamevars.data;
				testdata = gamevars.load(testgame.publickey) || {};
	            done();
	        }
		
			gamevarsready();
		}
		
		dbready();
	});
     
    it("Gamevars load correctly", function() {
        assert.notEqual(Object.keys(gvdata).length, 0);
    });
    
    it("Single game's data loads correctly", function() {
        assert.equal(Object.keys(testdata).length, 3);
        assert.equal(testdata.hasOwnProperty("testvar1"), true);
        assert.equal(testdata.hasOwnProperty("testvar2"), true);
        assert.equal(testdata.hasOwnProperty("testvar3"), true);
    });
    
    it("Value is expected", function() {
        assert.equal(testdata.testvar1, "testvalue1");
        assert.equal(testdata.testvar2, "testvalue2");
        assert.equal(testdata.testvar3, "testvalue3 and the final gamevar");
    });
    
    it("V1 JSON structure", function(done) {

        v1.load(testgame.payload, testgame.request, testgame.response, function(error, output) {
            assert.equal(error, null);
            assert.notEqual(output, null);

            var json = JSON.parse(output);
            assert.notEqual(json, null);

            assert.equal(Object.keys(json).length, 5);
            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            done();
        });
    });
});