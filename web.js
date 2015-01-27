var express = require("express"),
    bodyParser = require('body-parser'),
    querystring = require("querystring"),
    v1 = require(__dirname + "/v1/router.js");
    
require(__dirname + "/api/database.js"), // to trigger the setup
require(__dirname + "/api/ping.js"); // to keep the app awake
	
var app = express();

// Basic request preparation and stuffing post data into req
var prepareRequests = function(request, response, next) {

    request.ip = request.headers["x-forwarded-for"] || request.connection.remoteAddress;

    // cross-origin request headers
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    response.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type");

    //console.log("request.method =" + request.method);
    //console.log("request.body = " + request.body);
    //console.log("request.body.data = " + request.body.data);

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

var router = express.Router();

router.use(prepareRequests);

// Configuration
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

if ('production' == app.get('env')) {
    process.on("uncaughtException", function (exceptionmessage) {
        console.log("EXCEPTION: \n" + exceptionmessage);
    });
}

// start
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port + ", env: " + process.env.NODE_ENV + ", local: " + (process.env.local || false));
});

//*tj TEMP
//router.use(function(req, res, next) {
//    console.log(req.method, req.url);
//    next();
//})

// cross domain
var crossdomain = "<?xml version=\"1.0\"?><!DOCTYPE cross-domain-policy SYSTEM \"http://www.adobe.com/xml/dtds/cross-domain-policy.dtd\"><cross-domain-policy><site-control permitted-cross-domain-policies=\"master-only\" /><allow-access-from domain=\"*\" to-ports=\"*\" secure=\"false\" /><allow-http-request-headers-from domain=\"*\" headers=\"*\" /></cross-domain-policy>";
var XML_HEADER = {"Content-Type": "text/xml"};

router.all("/crossdomain.xml", function(request, response) {
    response.writeHead(200, XML_HEADER);
    response.end(crossdomain);
});

// everything else
router.all("/v1", function(req, res, next) {
    v1.router(req, res, next);
});

app.use("/", router);
