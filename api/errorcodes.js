module.exports = {
    
    errorcodes: {

        NoError: 0,
        GeneralError: 1,
        InvalidGame: 2,
        Timeout: 3,
        InvalidRequest: 4,
        DoNotTrack: 5,
    
        GeoIPDisabled: 100,
    
        LeaderboardsDisabled: 200,
        InvalidName: 201,
        InvalidAuthKey: 202,
        NoFacebookId: 203,
        NoTableName: 204,
        InvalidPermalink: 205,
        NoLeaderboardId: 206,
        InvalidLeaderboardId: 207,
        PlayerBanned: 208,
        NotBestScore: 209,
    
        GameVarsDisabled: 300,
    
        PlayerLevelsDisabled: 400,
        InvalidRating: 401,
        AlreadyRated: 402,
        NoLevelName: 403,
        NoLevelId: 404,
        LevelAlreadyExists: 405,
		
		AchievementsDisabled: 500,
		NoPlayerId: 501,
		NoPlayerName: 502,
		NoAchievement: 503,
		InvalidAchievement: 504,
		AlreadyHadAchievementNotSaved: 505,
		AlreadyHadAchievementSaved: 506,
		
		NewsletterDisabled: 600,
		MailChimpNotConfigured: 601,
		MailChimpError: 602
	},

    descriptions: {
        // General Errors
        "0": "No error",
        "1": "General error, this typically means the player is unable to connect",
        "2": "Invalid game credentials. Make sure you use the keys you set up in your database",
        "3": "Request timed out",
        "4": "Invalid request",
    
        // GeoIP Errors
        "100": "GeoIP API has been disabled for this game",
    
        // Leaderboard Errors
        "200": "Leaderboard API has been disabled for this game",
        "201": "The player's name was not provided when saving a score",
		"203": "Player is banned from submitting scores in this game",
		"204": "Score was not saved because it was not the player's best.  You can allow players to have more than one score by specifying allowduplicates=true in your save options",

        // GameVars Errors
        "300": "GameVars API has been disabled for this game",
    
        // LevelSharing Errors
        "400": "Level sharing API has been disabled for this game",
        "401": "Invalid rating value (must be 1 - 10)",
        "402": "Player has already rated that level",
        "403": "Missing level name",
        "404": "Missing levelid",
        "405": "Level already exists",
		
		// Achievement errors
		"500": "Achievements API has been disabled for this game",
		"501": "Missing playerid",
		"502": "Missing player name",
		"503": "Missing achievement",
		"504": "Invalid achievement for achievement key",
		"505": "Player already had the achievement.  You can overwrite old achievements with overwrite=true or save each time the player is awarded with allowduplicates=true",
		"506": "Player already had the achievement and it was overwritten or a duplicate was saved successfully",
		
		// Newsletter errors
		"600": "Newsletter API has been disabled for this game",
		"601": "MailChimp API key is not configured",
		"602": "The MailChimp API returned an error"
    }
};