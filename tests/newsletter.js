var testgame = require(__dirname + "/testgame.js"),
	config = require(__dirname + "/../api/config.js"),
    newsletter = require(__dirname + "/../api/newsletter.js"),
	v1 = require(__dirname + "/../v1/newsletter.js"),
	assert = require("assert");
	
// setup
config.mailchimp.apikey = "194edfd523676481bbf6011499ed8979-us7";
config.mailchimp.listid = "df7f7ae1e0";
config.mailchimp.apiurl = "us7.api.mailchimp.com";

describe("newsletter", function() {

    it("Subscribe", function(done) {
		var options = { 
			email: "test@testuri.com",
			ipaddress: testgame.request.ip,
			publickey: testgame.publickey
		};
		
		newsletter.subscribe(options, function(error, errorcode) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
			done();
		});
    });
	
    it("Subscribe with invalid email", function(done) {
		var options = { 
			email: "test invalid@testuri.com",
			ipaddress: testgame.request.ip,
			publickey: testgame.publickey
		};
		
		newsletter.subscribe(options, function(error, errorcode) {
            assert.notEqual(error, null);
            assert.equal(errorcode, 602);
			done();
		});
    });
	
    it("Subscribe with MERGE fields", function(done) {
		var options = { 
			email: "test@testuri.com",
			ipaddress: testgame.request.ip,
			publickey: testgame.publickey,
			fields: { 
				TESTSTRING: "this is a string",
				TESTNUMBER: 1.234,
				TESTDATE: "2013-05-21"
			}
		};
		
		newsletter.subscribe(options, function(error, errorcode) {
            assert.equal(error, null);
            assert.equal(errorcode, 0);
			done();
		});
    });
	
    it("V1 JSON structure (invalid)", function(done) {
		
        var payload = {
			email: "test invalid@testuri.com",
			ipaddress: testgame.request.ip,
            publickey: testgame.publickey
        };

        v1.subscribe(payload, testgame.request, testgame.response, function(error) {
            assert.notEqual(error, null);
            done();
        });
	});
	
    it("V1 JSON structure (valid)", function(done) {
		
        var payload = {
			email: "test@testuri.com",
			ipaddress: testgame.request.ip,
            publickey: testgame.publickey,
			fields: { 
				TESTSTRING: "this is a string",
				TESTNUMBER: 1.234,
				TESTDATE: "2013-05-21"
			}
        };

        v1.subscribe(payload, testgame.request, testgame.response, function(error, output) {
			
            assert.notEqual(output, null);
            var json;

            try {
                json = JSON.parse(output);
            } catch(s) {

            }

            assert.notEqual(json, null);
            assert.equal(json.errorcode, 0);
            done();
        });
	});
	

	/*
	turns out the mrege fields don't trigger rejection or errors
	
    it("Subscribe with invalid MERGE fields", function(done) {
		var options = { 
			email: "testinvalid@testuri.com",
			ipaddress: testgame.request.ip,
			publickey: testgame.publickey,
			fields: { 
				TESTSTRING: 1.493,
				TESTNUMBER: "This is a string",
				TESTDATE: "2013-13-13"
			}
		};
		
		newsletter.subscribe(options, function(error, errorcode) {
            assert.notEqual(error, null);
            assert.equal(errorcode, 602);
			done();
		});
    });*/
});