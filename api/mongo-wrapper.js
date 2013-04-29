var mongodb = require("mongodb"),
    localcache = {},
    connections = {},
    allconnections = [],
    debug = process.env.debug || false;

/**
 * Database configurations, this way your api calls are more simple
 * like:  db.get("local", "mystuff", ....
 */
var databases = {
    test: {
        address: "127.0.0.1",
        port: 27017,
        name: "test"
    },
    local2: {
        address: "127.0.0.1",
        port: 27017,
        name: "local2"
    }
};

/**
 * Helper functions
 */
function trace(message) {

    if(!trace) {
        return;
    }

    console.log("mongowrapper: " + message);
}

/**
 * Terminates a connection.
 * @param connection The collection name
 * @param db The database client
 */
function killConnection(cnn, error) {

    cnn.inuse = false;

    // disposed of after we terminated it
    if(!cnn.connection || !cnn.db) {
        cnn = null;
        return;
    }

    if(!error && module.exports.poolEnabled && cnn.db && cnn.connection) {

        var database = databases[cnn.databasename];

        if(!database.pool) {
            cnn.expire = 30;
            database.pool = [cnn];
            return;
        }

        if(database.pool.length < module.exports.poolSize) {
            cnn.expire = 30;
            database.pool.push(cnn);
            return;
        }
    }

    cnn.connection.close();
    cnn.db.close();
    cnn.connection = null;
    cnn.db = null;
    delete(cnn.connection);
    delete(cnn.db);
    cnn = null;
    return;
}

/**
 * Pool cleaning
 */
setInterval(function() {

    if(!module.exports.poolEnabled && !module.exports.killEnabled)
        return;

    for(var i=allconnections.length - 1; i>-1; i--) {

        var cnn = allconnections[i];
        cnn.expire--;

        if(cnn.expire > 0) {
            continue;
        }

        if(cnn.inuse) {
            cnn.inuse = false;
            cnn.expire = module.exports.expireConnection;
            continue;
        }

        // remove from global pool
        allconnections.splice(i, 1);

        // remove from database pool
        var db = databases[cnn.databasename];

        if(db.pool && db.pool.length) {
            var dbp = db.pool.indexOf(cnn);

            if(dbp > -1) {
                db.pool.splice(dbp, 1);
            }
        }

        // close it
        if(cnn.connection && cnn.connection.close) {
            cnn.connection.close();
            cnn.connection = null;
            delete(cnn.connection);
        }

        if(cnn.db && cnn.db.close) {
            cnn.db.close();
            cnn.db = null;
            delete(cnn.db);
        }

        cnn = null;
    }
}, 1000);

/**
 * Nice and simple persistant connections.  If your application runs on
 * a PaaS or multiple instances each worker/whatever will have its own
 * connection pool.
 *
 * @param databasename Database configuration name
 * @param collectionname The collection name
 * @param operation The api operation
 * @param callback The callback function
 */
function getConnection(databasename, collectionname, operation, callback) {

    var database = databases[databasename];

    if(module.exports.poolEnabled && database.pool && database.pool.length) {

        var cnn = database.pool.pop();

        if(cnn && cnn.connection && cnn.connection.state == "connected") {
            cnn.expire = module.exports.expireConnection;
            cnn.inuse = true;
            callback(null, collectionname ? new mongodb.Collection(cnn.connection, collectionname) : null, cnn);
            return;
        } else {
           killConnection(cnn, false);
        }
    }

    var options = {
        slave_ok: true
    };

    var db = new mongodb.Db(database.name, new mongodb.Server(database.address, database.port, options));
    db.open(function (error, connection) {

        var cnn = {connection: connection, db: db, databasename: databasename, expire: module.exports.expireConnection, inuse: true};

        if(module.exports.killEnabled) {
            allconnections.push(cnn);
        }

        if(error) {
            trace("connection failed to " + databasename + ": "+ error);
            getConnection(databasename, collectionname, operation, callback);
            killConnection(cnn, error);
            return;
        }

        if(!database.username && !database.password) {

            callback(null, collectionname ? new mongodb.Collection(connection, collectionname) : null, cnn);
            return;
        }

        connection.authenticate(database.username, database.password, function(error) {

            if(error) {
                trace("unable to authenticate to " + database.name + " with " + database.username + " / " + database.password);
                getConnection(databasename, collectionname, operation, callback);
                killConnection(cnn, error);
                return;
            }

            callback(null, collectionname ? new mongodb.Collection(connection, collectionname) : null, cnn);
        });
    });
}

module.exports = db = {

    /**
     * Configuration settings
     * poolEnabled stores connections to be reused
     * poolLimit the maximum number of connections to store
     * cacheEnabled stores data from get, getAndCount and queries
     * defaultCacheTime seconds to store cache data
     * killEnabled destroys connections after up to 2x expireConnection depending on in use or not
     * expireConnection how long to keep connections
     */
    poolEnabled: true,
    cacheEnabled: true,
    killEnabled: true,
    defaultCacheTime: 60,
    poolLimit: 20,
    expireConnection: 30,

    /**
     * Import your own database collection
     *
     * @param dblist Your databases:  { db1: { address: "", port: , name: "db1" }, ... }
     */
    setDatabases:function(dblist) {
        databases = dblist;
        configureDatabases();
    },

    /**
     * Inserts an object into a collection.
     *
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { doc: {}, safe: false }
     * @param callback Your callback method(error, item)
     */
    insert: function(database, collectionname, options, callback) {

        getConnection(database, collectionname, "insert", function(error, collection, cnn) {

            collection.insert(options.doc, {safe: options.safe}, function(error, items) {

                killConnection(cnn, error);

                if(error) {

                    trace("insert error: " + error);
                    if(callback) {
                        callback(error);
                    }

                    return;
                }

                if(callback) {
                    callback(null, items.length > 0 ? items[0] : {});
                }

                killConnection(cnn);
            });
        });
    },

    /**
     * Updates / Upserts an object into a collection.
     *
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { filter: {}, doc: {}, safe: false, upsert: true }
     * @param callback Your callback method(error, success)
     */
    update: function(database, collectionname, options, callback) {

        getConnection(database, collectionname, "update", function(error, collection, cnn) {

            collection.update(options.filter, options.doc, {safe: options.safe || false, upsert: options.upsert || true}, function(error) {

                killConnection(cnn, error);

                if(callback) {
                    callback(error, error == null);
                }

                if(error) {
                    trace("update error: " + error);
                }
            });
        });
    },

    /**
     * Selects one or more items
     *
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { filter: {}, limit: 0, skip: 0, sort: {}, cache: false, cachetime: 60 }
     * @param callback Your callback method(error, items)
     */
    get: function(database, collectionname, options, callback) {

        if(options.cache) {
            var cached = cache.get(database, collectionname, "get", options);

            if(cached) {
                callback(null, cached);
                return;
            }
        }

        getConnection(database, collectionname, "get", function(error, collection, cnn) {

            collection.find(options.filter || {}).limit(options.limit || 0).skip(options.skip || 0).sort(options.sort || {}).toArray(function (error, items) {

                killConnection(cnn, error);

                if(error) {
                    trace("get error: " + error);
                } else if(options.cache) {
                    cache.set(database, collectionname, "get", options, items);
                }

                if(callback) {
                    callback(error, items || []);
                }
            });

        });
    },

    /**
     * Selects a single item or inserts it
     *
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { filter: {}, doc: {}, safe: true or false }
     * @param callback Your callback method(error, item)
     */
    getOrInsert: function(database, collectionname, options, callback) {

        getConnection(database, collectionname, "getOrInsert", function(error, collection, cnn) {

            collection.find(options.filter).limit(1).toArray(function (error, items) {

                if (error) {

                    killConnection(cnn, error);

                    if(callback) {
                        callback(error, []);
                    }

                    trace("getOrInsert error: " + error);
                    return;
                }

                // get it
                if(items.length > 0) {
                    killConnection(cnn, error);
                    callback(null, items[0]);
                    return;
                }

                // insert it
                collection.insert(options.doc, {safe: options.safe || false}, function(error, item) {

                    killConnection(cnn, error);

                    if(error) {

                        if(callback) {
                            callback(error, null);
                        }

                        trace("getOrInsert error2: " + error);
                        return;
                    }

                    if(callback) {
                        callback(null, item[0]);
                    }
                });
            });
        });
    },

    /**
     * Selects a subset of items and returns the total number
     *
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { filter: {}, limit: 0, skip: 0, sort: {}, cache: false, cachetime: 60 }
     * @param callback Your callback method(error, items, numitems)
     */
    getAndCount: function(database, collectionname, options, callback) {

        if(options.cache) {
            var cached = cache.get(database, collectionname, "getAndCount", options);

            if(cached) {
                callback(null, cached.items, cached.numitems);
                return;
            }
        }

        getConnection(database, collectionname, "getAndCount", function(error, collection, cnn) {

            if(error) {

                if(callback) {
                    callback(error, [], 0);
                }

                trace("getAndCount error: " + error);
                killConnection(cnn, error);
                return;
            }

            collection.find(options.filter || {}).limit(options.limit || 0).skip(options.skip || 0).sort(options.sort || {}).toArray(function (error, items) {

                if (error) {

                    if(callback) {
                        callback(error, [], 0);
                    }

                    trace("getAndCount error: " + error);
                    killConnection(cnn, error);
                    return;
                }

                // note we could use the api here but it would potentially
                // establish a second connection and change the cache key
                collection.count(options.filter, function(error, numitems) {

                    killConnection(cnn, error);

                    if (error) {

                        if(callback) {
                            callback(error, [], 0);
                        }

                        trace("getAndCount error: " + error);
                        return;
                    }

                    if(options.cache) {
                        cache.set(database, collectionname, "getAndCount", options, {items: items, numitems: numitems});
                    }

                    if(callback) {
                        callback(null, items, numitems);
                    }
                });
            });
        });
    },

    /**
     * Counts the number of items matching a query
     *
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { filter: {}, cache: false, cachetime: 60 }
     * @param callback Your callback method(error, numitems)
     */
    count: function(database, collectionname, options, callback) {

        if(options.cache) {
            var cached = cache.get(database, collectionname, "count", options);

            if(cached) {
                callback(null, cached);
                return;
            }
        }

        getConnection(database, collectionname, "count", function(error, collection, cnn) {

            collection.count(options.filter, function (error, numitems) {

                killConnection(cnn, error);

                if (error) {
                    if(callback) {
                        callback(error, []);
                    }

                    trace("count error: " + error);
                    return;
                }

                if(options.cache) {
                    cache.set(database, collectionname, "count", numitems);
                }

                if(callback) {
                    callback(null, numitems);
                }
            });
        });
    },

    /**
     * Moves a document from one collection to another
     * @param database Database config name
     * @param collection1name The source collection name
     * @param collection2name The destination collection name
     * @param options { doc: {... }, overwrite: true, safe: false, }
     * @param callback Your callback method(error, success)
     */
    move: function(database, collection1name, collection2name, options, callback) {

        getConnection(database, collection1name, "move", function(error, collection1, cnn1) {

            if(error) {

                if(callback) {
                    callback(error);
                }

                trace("move error: " + error);
                killConnection(cnn1, error);
                return;
            }

            getConnection(database, collection2name, "move", function(error, collection2, cnn2) {

                if(error) {

                    if(callback) {
                        callback(error);
                    }

                    trace("remove error: " + error);
                    killConnection(cnn1);
                    killConnection(cnn2, error);
                    return;
                }

                collection2.update(options.doc, options.doc, {safe: options.safe || false, upsert: options.upsert || options.overwrite}, function(error) {

                    if(error) {

                        if(callback) {
                            callback(error);
                        }

                        trace("remove error: " + error);
                        killConnection(cnn1);
                        killConnection(cnn2, error);
                        return;
                    }

                    collection1.remove(options.doc, function(error) {

                        killConnection(cnn1, error);
                        killConnection(cnn2);

                        if(error) {

                            if(callback) {
                                callback(error, false);
                            }

                            trace("remove error: " + error);
                            return;
                        }

                        if(callback) {
                            callback(null);
                        }
                    });
                });
            });
        })
    },

    /**
     * Removes one or more documents from a collection
     * @param database Database config name
     * @param collectionname The collection name
     * @param options { filter: {} }
     * @param callback Your callback method(error, success)
     */
    remove: function(database, collectionname, options, callback) {

        getConnection(database, collectionname, "remove", function(error, collection, cnn) {

            if(error) {

                if(callback) {
                    callback(error, false);
                }

                trace("remove error: " + error);
                killConnection(cnn, error);
                return;
            }

            collection.remove(options.filter, function(error) {

                killConnection(cnn, error);

                if(error) {
                    trace("remove error: " + error);
                }

                if(callback) {
                    callback(error, error == null);
                }
            });
        });
    }
};


/**
 * A very simple, self cleaning, local cache.  If your app runs on multiple threads
 * or a PaaS like Heroku each dyno / worker / whatever will have its own copy
 */
var cache = {

    get: function(databasename, collectionname, operation, options) {

        if(!db.cacheEnabled) {
            return null;
        }

        var database = databases[databasename];
        var key = database.name + ":" + database.collectionname + ":" + operation + ":" + JSON.stringify(options);
        return localcache[key] ? localcache[key].data : null;
    },

    set: function(databasename, collectionname, operation, options, obj) {

        if(!db.cacheEnabled) {
            return;
        }

        var database = databases[databasename];
        var key = database.name + ":" + database.collectionname + ":" + operation + ":" + JSON.stringify(options);
        localcache[key] = { data: obj, time: options.cachetime || db.defaultCacheTime};
    }
}

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

/*
 * Shorthand access to functions via db and collections
 */
for(var databasename in databases) {

    var dbn = databases[databasename].name;
    db[dbn] = databases[databasename];
    db[dbn].dbn = dbn;

    /**
     * Initializes a single collection's shorthand
     * @param cdn the collection name
     */
    db[dbn].collection = function(cdn) {

        var ddbn = this.dbn;

        if(db[this.dbn][cdn]) {
            return;
        }

        db[ddbn][cdn] = {};
        db[ddbn][cdn].cdn = cdn;
        db[ddbn][cdn].dbn = ddbn;
        db[ddbn][cdn].get = function(options, callback) { db.get(this.dbn, this.cdn, options, callback); }
        db[ddbn][cdn].getOrInsert = function(options, callback) { db.getOrInsert(this.dbn, this.cdn, options, callback); }
        db[ddbn][cdn].getAndCount = function(options, callback) { db.getAndCount(this.dbn, this.cdn, options, callback); }
        db[ddbn][cdn].count = function(options, callback) { db.count(this.dbn, this.cdn, options, callback); }
        db[ddbn][cdn].move = function(collection2name, options, callback) { db.move(this.dbn, this.cdn, collection2name, options, callback); }
        db[ddbn][cdn].update = function(options, callback) { db.update(this.dbn, this.cdn, options, callback) };
        db[ddbn][cdn].insert = function(options, callback) { db.insert(this.dbn, this.cdn, options, callback) };
        db[ddbn][cdn].remove = function(options, callback) { db.remove(this.dbn, this.cdn, options, callback); }
    };

    /**
     * Initializes the collection shorthand on a database
     * @param opt either an array of collection names or a callback method(error) for
     * loading directly from the db
     */
    db[dbn].collections = function(opt) {

        var callback;

        if(opt) {

            if(typeof opt === 'function') {
                callback = opt;
            } else {
                for(var i=0; i<opt.length; i++) {
                    this.collection(opt[i]);
                }

                return;
            }
        }

        var ddbn = this.dbn;
        getConnection(ddbn, "", "", function(error, collection, cnn) {

            if(error) {
                killConnection(cnn);
                callback(error);
                return;
            }

            connection.collectionNames({namesOnly: true}, function(error, names) {

                if(error) {
                    killConnection(cnn);
                    callback(error);
                    return;
                }

                for(var i=0; i<names.length; i++) {

                    var name = names[i];

                    if(name.indexOf(ddbn + ".system.") == 0)
                        continue;

                    var dcdn = name.substring(ddbn.length + 1);

                    db[ddbn].collection(dcdn);
                }

                killConnection(cnn);
                callback(null);
            });
        });
    }
}

/*
 * Creates the shorthand references to databases and provides methods
 * for including shorthand collection paths too.  You don't need to call
 * this manually, it will automatically apply to the locally defined
 * list of databases, or run again if you pass your own configuration.
 */
function configureDatabases() {

    for(var databasename in databases) {

        var databasename = databases[databasename].alias || databasename;

        var dbn = "playtomic";
        databasename = databases[databasename].name;

        db[dbn] = databases[databasename];
        db[dbn].dbn = dbn;

        /**
         * Initializes a single collection's shorthand
         * @param cdn the collection name
         */
        db[dbn].collection = function(cdn) {

            var ddbn = this.dbn;

            if(db[this.dbn][cdn]) {
                return;
            }

            db[ddbn][cdn] = {};
            db[ddbn][cdn].cdn = cdn;
            db[ddbn][cdn].dbn = ddbn;
            db[ddbn][cdn].get = function(options, callback) { db.get(this.dbn, this.cdn, options, callback); }
            db[ddbn][cdn].getOrInsert = function(options, callback) { db.getOrInsert(this.dbn, this.cdn, options, callback); }
            db[ddbn][cdn].getAndCount = function(options, callback) { db.getAndCount(this.dbn, this.cdn, options, callback); }
            db[ddbn][cdn].count = function(options, callback) { db.count(this.dbn, this.cdn, options, callback); }
            db[ddbn][cdn].move = function(collection2name, options, callback) { db.move(this.dbn, this.cdn, collection2name, options, callback); }
            db[ddbn][cdn].update = function(options, callback) { db.update(this.dbn, this.cdn, options, callback) };
            db[ddbn][cdn].insert = function(options, callback) { db.insert(this.dbn, this.cdn, options, callback) };
            db[ddbn][cdn].remove = function(options, callback) { db.remove(this.dbn, this.cdn, options, callback); }
        };

        /**
         * Initializes the collection shorthand on a database
         * @param opt either an array of collection names or a callback method(error) for
         * loading directly from the db
         */
        db[dbn].collections = function(opt) {

            var callback;

            if(opt) {

                if(typeof opt === 'function') {
                    callback = opt;
                } else {
                    for(var i=0; i<opt.length; i++) {
                        this.collection(opt[i]);
                    }

                    return;
                }
            }

            var ddbn = this.dbn;
            getConnection(ddbn, "", "", function(error, collection, cnn) {

                if(error) {
                    callback(error);
                    return;
                }

                connection.collectionNames({namesOnly: true}, function(error, names) {

                    if(error) {
                        callback(error);
                        return;
                    }

                    for(var i=0; i<names.length; i++) {

                        var name = names[i];

                        if(name.indexOf(ddbn + ".system.") == 0)
                            continue;

                        var dcdn = name.substring(ddbn.length + 1);

                        db[ddbn].collection(dcdn);
                    }

                    connection.close();
                    connection = null;
                    callback(null);
                });
            });
        }
    }
}

configureDatabases();