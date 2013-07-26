var http = require("http"),
	https = require("https");
	
(function() {
	
	var apiurl = process.env.url || "http://playtomic.org";

	if(!apiurl) {
		return;
	}
	
	var protocol = apiurl.indexOf("https") == 0 ? https : http;
	apiurl = apiurl.substring(apiurl.indexOf("://") + 3);

	if(apiurl.indexOf("/") > -1) {
		apiurl = apiurl.substring(0, apiurl.indexOf("/"));
	}
	
	var options = {
		host: apiurl,
		port: protocol == https ? 443 : 80, 
		path: "/crossdomain.xml",  
		method: "HEAD"
	};
	
	if(protocol == https) {
		options.secureProtocol = "SSLv3_method"
	};
	
	setInterval(function() {
		
		var req = protocol.request(options, function(response) { 
			response.on("error", function(error) { });
			response.on("data", function(error) { });
		});   
		
		req.on("error", function(error) {
			console.log(error);
		});
		
	    req.end();
	
	}, 10000);

})();