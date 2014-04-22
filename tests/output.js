var testgame = require(__dirname + "/testgame.js"),
    db = require(__dirname + "/../api/database.js"),
    v1 = require(__dirname + "/../v1/output.js"),
    assert = require("assert");

describe("output", function() {
	
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

    it("terminate gives expected response", function() {
        var rrr = v1.terminate(testgame.payload, testgame.response, 1, "an error message");
        assert.notEqual(rrr, null);

        var json = JSON.parse(rrr);
        assert.notEqual(json, null);
        assert.equal(json.success, false);
        assert.equal(json.errorcode, 1);
        assert.equal(json.exceptionmessage, "an error message");
    });

    it("end gives expected response", function() {
        var rrr = v1.end(testgame.payload, testgame.response, { sample: 1 }, 0);
        assert.notEqual(rrr, null);

        var json = JSON.parse(rrr);
        assert.notEqual(json, null);
        assert.equal(json.success, true);
        assert.equal(json.errorcode, 0);
        assert.equal(json.sample, 1);
    });
});