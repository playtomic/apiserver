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
        LevelAlreadyExists: 405
    },

    descriptions: {
        // General Errors
        "0": "No error",
        "1": "General error, this typically means the player is unable to connect to the Playtomic servers",
        "2": "Invalid game credentials. Make sure you use your SWFID, GUID and if necessary API KEY from the 'API' section in the dashboard.",
        "3": "Request timed out.",
        "4": "Invalid request.",
    
        // GeoIP Errors
        "100": "GeoIP API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
    
        // Leaderboard Errors
        "200": "Leaderboard API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
        "201": "The source URL or name weren't provided when saving a score. Make sure the player specifies a name and the game is initialized before anything else using the code in the `Set your game up` section.",
        "202": "Invalid auth key. You should not see this normally, players might if they tamper with your game.",
        "203": "No Facebook user id on a score specified as a Facebook submission.",
        "204": "Table name wasn't specified for creating a private leaderboard.",
        "205": "Permalink structure wasn't specified: http://website.com/game/whatever?leaderboard=",
        "206": "Leaderboard id wasn't provided loading a private leaderboard.",
        "207": "Invalid leaderboard id was provided for a private leaderboard.",
        "208": "Player is banned from submitting scores in your game.",
        "209": "Score was not the player's best score.  You can notify the player, highlight their best score via score.SubmittedOrBest, or circumvent this by specifying 'allowduplicates' to be true in your save options.",
    
        // GameVars Errors
        "300": "GameVars API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
    
        // LevelSharing Errors
        "400": "Level sharing API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
        "401": "Invalid rating value (must be 1 - 10).",
        "402": "Player has already rated that level.",
        "403": "Missing level name",
        "404": "Missing levelid.",
        "405": "Level already exists."
    }
};