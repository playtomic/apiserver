var https = require("https"),
	errorcodes = require(__dirname + "/errorcodes.js").errorcodes,
	config = require(__dirname + "/config.js");
	
// test configuration for client apis, note that this mailing list
// is exclusively for testing the Playtomic api 
if(process.env.testing) {
	config.mailchimp.apikey = "194edfd523676481bbf6011499ed8979-us7";
	config.mailchimp.listid = "df7f7ae1e0";
	config.mailchimp.apiurl = "us7.api.mailchimp.com";
}	

var newsletter = module.exports = {
	
	subscribe: function(options, callback) {
		
		if(!config.mailchimp.apikey) {
			return callback("MailChimp API is not configured", errorcodes.MailChimpError);
		}
	
		var data = {
			apikey: config.mailchimp.apikey,
			id: config.mailchimp.listid,
			email_address: options.email,
			double_optin: config.mailchimp.doubleoptin || true,
			update_existing: config.mailchimp.allowupdates || true,
			merge_vars: {
				OPTIN_IP: options.ipaddress
			}
		};
		
		if(options.fields) {
			for(var x in options.fields) {
				data.merge_vars[x] = options.fields[x];
			}
		}

		var payload = JSON.stringify(data);
		
		var options = {  
			host: config.mailchimp.apiurl,   
			port: 443,   
			path: "/1.3/?method=listSubscribe",  
			method: "POST",
			secureProtocol: "SSLv3_method",
			headers: { 
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": payload.length,
				accept: "*/*"
			}
		};
			  
		var req = https.request(options, function(res) { 
			var cancelled = false;
			
			res.on("error", function(error) {
				cancelled = true;
				return callback(error, errorcodes.GeneralError);
			});
		
			res.on("data", function(bodytext) {  
				
				if(cancelled) {
					return;
				}
				
				//console.log("body: " + bodytext);
				
				if(bodytext == "true") {
					//console.log("success");
					callback(null, errorcodes.NoError);
				} else {
					var jresponse = JSON.parse(bodytext);
					//console.log("error: " + jresponse.error);
					callback(jresponse.error, errorcodes.MailChimpError);
				}
			});
		});   
		
		req.write(payload);
	    req.end();
	}
} 