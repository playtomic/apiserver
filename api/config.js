var config = module.exports = {
    mongo: {
        playtomic: parseCredentials(process.env.playtomic || "mongodb://playtomic:playtomic@127.0.0.1:27017/playtomic")
    },
	mailchimp: {
		apikey: process.env.mailchimp,
		listid: process.env.mailchimp_listid,
		apiurl: parseAPIUrl(),
		doubleoptin: process.env.mailchimp_doubleoptin || true,
		updateexisting: process.env.mailchimp_allowupdates || true,
	}
};

function parseAPIUrl() {
	
	if(!process.env.mailchimp) {
		return null;
	}
	
	var apiurl = process.env.mailchimp;
	var dc = apikey.substring(apikey.indexOf("-") + 1);
	return dc + ".api.mailchimp.com";
}

function parseCredentials(connstring) {
    var username = connstring.split("://")[1];
    username = username.substring(0, username.indexOf(":"));
    var password = connstring.split("://")[1];
    password = password.substring(password.indexOf(":") + 1);
    password = password.substring(0, password.indexOf("@"));
    var host = connstring.split("@")[1];
    host = host.substring(0, host.indexOf(":"));
    var port = connstring.split("@")[1];
    port = port.substring(port.indexOf(":") + 1);

    if(port.indexOf("/") > -1) {
        port = port.substring(0, port.indexOf("/"));
    }

    port = parseInt(port);

    // optional database
    var database = connstring.split("/");
    database = database[database.length - 1];

    return {
        alias: "playtomic",
        username: username,
        password: password,
        address: host,
        port: port,
        name: database
    }
}