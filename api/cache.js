var md5 = require(__dirname + "/md5.js"),
    localcache = {};

var cache = module.exports = {

    get: function(rkey, callback) {
        var key = cache.key(rkey);
        var lkey = cache.lkey(key);
        
        if(localcache[lkey]) {
            callback(localcache[lkey].data);
            return;
        }
        
        callback(null);
    },

    set: function(rkey, obj, time) {
        var key = cache.key(rkey);
        var lkey = cache.lkey(key);
        localcache[lkey] = { data: obj, time: 60};
    },
    
    key: function(rkey) {
        return "cache:" + md5(rkey);
    },
    
    lkey: function(key) {
        return md5(key);
    }
};

// cache cleaning
setInterval(function() {
    
    for(var key in localcache) {
        
        localcache[key].time--;
                
        if(localcache[key].time > 0) {
            continue;
        }
        
        localcache[key] = null;
        delete localcache[key];
    }
    
}, 1000);