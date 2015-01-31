var testgame = require(__dirname + "/testgame.js"),
    gamevars = require(__dirname + "/../api/gamevars.js"),
    db = require(__dirname + "/../api/database.js"),
    v1 = require(__dirname + "/../v1/gamevars.js"),
    assert = require("assert");

describe("gamevars", function() {
    
    var gvdata = null;
    
     before(function(done) {
		
		// insert our test data
        db.GameVar.remove({ publickey: testgame.publickey }, function(error) {
        	
        	var data = [
        		{ name: "testvar1", value: "testvalue1" },
        		{ name: "testvar2", value: "testvalue2" },
        		{ name: "testvar3", value: "testvalue3 and the final gamevar" }
        	];
        	
			function waitForCache() {
    			if(!gamevars.ready) {
					return setTimeout(waitForCache, 100);
				}	
					
				gvdata = gamevars.load(testgame.publickey);
				return done();
			}
        	
        	function nextGameVar() {
        		if(data.length === 0) {
        			// we're finished but we need to wait for the cache to update
        			gamevars.ready = false;
        			gamevars.forceRefresh();
        			return waitForCache();
        		}
        		
        		var gamevar = data.shift();
        		gamevar.publickey = "testpublickey";
        		
				var ngamevar = new db.GameVar(gamevar);
				ngamevar.save(function(error) {
					if(error) {
						throw(error);
					}
					
					return nextGameVar();
				});
        	}
        	
        	nextGameVar();
        });
    });
     
    it("Gamevars load correctly", function() {
        assert.notEqual(Object.keys(gvdata).length, 0);
    });
    
    it("Single game's data loads correctly", function() {
        assert.equal(Object.keys(gvdata).length, 3);
        assert.equal(gvdata.hasOwnProperty("testvar1"), true);
        assert.equal(gvdata.hasOwnProperty("testvar2"), true);
        assert.equal(gvdata.hasOwnProperty("testvar3"), true);
    });
    
    it("Value is expected", function() {
        assert.equal(gvdata.testvar1, "testvalue1");
        assert.equal(gvdata.testvar2, "testvalue2");
        assert.equal(gvdata.testvar3, "testvalue3 and the final gamevar");
    });
    
    it("V1 JSON structure", function(done) {
        v1.load(testgame.payload, testgame.request, testgame.response, function(error, output) {
            assert.equal(error, null);
            assert.notEqual(output, null);

            var json = JSON.parse(output);
            assert.notEqual(json, null);
            assert.equal(Object.keys(json).length, 3);

            var gamevars = json["gamevars"];
            assert.notEqual(gamevars, null);
            assert.equal(Object.keys(gamevars).length, 3);

            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            done();
        });
    });
});