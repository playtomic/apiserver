var md5 = require(__dirname + "/md5.js");

module.exports = {
    
    /**
    * Decrypts a string with the specified key and mode.
    */
    validate:function(src, hash, privatekey) {
        var db64 = new Buffer(src, "base64").toString("utf-8");
        var shash = md5(db64 + privatekey);
        return hash == shash ? db64 : null;
    }
};