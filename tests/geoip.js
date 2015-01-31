var geoip = require("geoip-native"),
    testgame = require(__dirname + "/testgame.js"),
    db = require(__dirname + "/../api/database.js"),
    v1 = require(__dirname + "/../v1/geoip.js"),
    assert = require("assert");

describe("geoip", function() {
	
    beforeEach(function(done) {

		// wait for db setup to complete
		function dbready() {
            if(!db.ready) {
            	return setTimeout(dbready, 100);
            }
            
            function geoipready(){
                if(!geoip.ready) {
                    return setTimeout(geoipready, 500);
                }
                
                return done();
            }
            
            geoipready();
		}
		
		dbready();
    });
     
    it("Expected returned value", function() {
        var result = geoip.lookup("62.163.200.241");
        assert.equal(result.name, "Netherlands");
        assert.equal(result.code, "NL");
    });

    it("Testing invalid requests", function(done) {

        var tests = [undefined, NaN , new Date(), new Date().getTime(), "256.10.10.10", "256.1.1.1", "asdfasdfsadf", null, Math.random()];

        function runtest() {
            var ip = tests.pop(),
                result = geoip.lookup(ip);

            if(!result.error) {
                console.log(ip + " is valid ... " + JSON.stringify(result));
            }

            assert.equal(result.hasOwnProperty("error"), true);
            assert.equal(result.hasOwnProperty("name"), false);
            assert.equal(result.hasOwnProperty("code"), false);
            
            if(!tests.length) {
                done();
            } else {
                runtest();
            }
        }

        runtest();
    });

    it("V1 JSON structure", function(done) {

        v1.lookup(testgame.payload, testgame.request, testgame.response, function(error, output) {
            assert.equal(error, null);
            assert.notEqual(output, null);
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            assert.equal(json.success, true);
            assert.equal(json.errorcode, 0);

            var geoip = json["geoip"];
            assert.equal(geoip.code, "NL");
            assert.equal(geoip.name, "Netherlands");
            done();
        });
    });
});