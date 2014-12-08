var db = require(__dirname + "/database.js"),
    datetime = require(__dirname + "/datetime.js"),
    varlist = {};

var gamevars = module.exports = {

    // for tests
    ready: false,
    data: varlist,

    /**
     * Loads the GameVars for a game
     * @param publickey
     */
    load: function(publickey) {
        return varlist[publickey] || {};
    },
    
    /**
     * Forces the cache to refresh
     */
    forceRefresh: function() {
       varlist = {};
       lastupdated = 0;
       refreshCache();
    }
};

// Data cache
var lastupdated = 0;
function refreshCache() {

    var filter = {$or: [{lastupdated: {$gte: lastupdated}}, {lastupdated: {$exists: false}}]};
    db.GameVar.find(filter).sort("lastupdated").exec(function(error, vars) {
        
        if(error) {
            console.log("GAMEVARS failed to retrieve results from mongodb: " + error);
            return setTimeout(refreshCache, 1000);
        }
        
        vars.forEach(function(gv) {
            
            if(!gv.lastupdated) {
                db.GameVar.update({_id: gv._id}, { lastupdated: datetime.now });
            } else if(gv.lastupdated > lastupdated) {
                lastupdated = gv.lastupdated;
            }
            
            var gamevar = gv.toObject();

            if(!gamevar.publickey) {
                return console.log("GAMEVARS warning you have gamevars configured that don't have a publickey");
            }
            
            if(!varlist[gamevar.publickey]) {
                varlist[gamevar.publickey] = {};
            }
            
            varlist[gamevar.publickey][gamevar.name] = gamevar.value;
        });
        
        gamevars.ready = true;
        return setTimeout(refreshCache, 30000);
    });
}

refreshCache();