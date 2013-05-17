var api = module.exports = {
    config: require(__dirname + "/config.js"),
    games: require(__dirname + "/games.js"),
    gamevars: require(__dirname + "/gamevars.js"),
    leaderboards: require(__dirname + "/leaderboards.js"),
    playerlevels: require(__dirname + "/playerlevels.js"),
	achievements: require(__dirname + "/achievements.js"),
    database: require(__dirname + "/database.js"),
    utils: require(__dirname + "/utils.js"),
	geoip: require(__dirname + "/geoip.js"),
    md5: require(__dirname + "/md5.js"),
    errorcodes: require(__dirname + "/errorcodes.js").errorcodes,
    errormessages: require(__dirname + "/errorcodes.js").descriptions,
    datetime: require(__dirname + "/datetime.js"),
	requestauth: require(__dirname + "/requestauth.js")
};