var express = require("express"),
    querystring = require("querystring"),
    v1 = require(__dirname + "/v1/router.js");
	
var app = express.createServer();

// Basic request preparation and stuffing post data into req
var prepareRequests = function(request, response, next) {

    request.ip = request.headers["x-forwarded-for"] || request.connection.remoteAddress;

    // cross-origin request headers
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    response.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type");

    // post data
    if(request.method != "POST" || (request.body && request.body.data)) {
        next();
        return;
    }

    var chunk = "";

    request.on("data", function (data) {
        chunk += data;
    });

    request.on("end", function () {
        request.body = querystring.parse(chunk);
        next();
    });
};


// Configuration
app.configure(function(){
    app.use(prepareRequests);
    app.use(express.bodyParser());
    app.use(app.router);
});

app.configure("production", function(){
    process.on("uncaughtException", function (exceptionmessage) {
        console.log("EXCEPTION: \n" + exceptionmessage);
    });
});

// start
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port + ", env: " + process.env.NODE_ENV + ", local: " + (process.env.local || false));
});

// cross domain
var crossdomainInsecure = "<?xml version=\"1.0\"?><!DOCTYPE cross-domain-policy SYSTEM \"http://www.adobe.com/xml/dtds/cross-domain-policy.dtd\"><cross-domain-policy><site-control permitted-cross-domain-policies=\"master-only\" /><allow-access-from domain=\"*\" to-ports=\"*\" /><allow-http-request-headers-from domain=\"*\" headers=\"*\" /></cross-domain-policy>";
var crossdomainSecure = "<?xml version=\"1.0\"?><!DOCTYPE cross-domain-policy SYSTEM \"http://www.adobe.com/xml/dtds/cross-domain-policy.dtd\"><cross-domain-policy><site-control permitted-cross-domain-policies=\"master-only\" /><allow-access-from domain=\"*\" to-ports=\"*\" secure=\"false\" /><allow-http-request-headers-from domain=\"*\" headers=\"*\" /></cross-domain-policy>";
var XML_HEADER = {"Content-Type": "text/xml"};

app.all("/crossdomain.xml", function(request, response) {
    response.writeHead(200, XML_HEADER);
    response.end(crossdomainSecure);
});

// everything else
app.all("/v1", v1.router);
