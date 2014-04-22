module.exports = {
    publickey: "testpublickey",
    privatekey: "testprivatekey",
    leaderboards: true,
    gamevars: true,
    geoip: true,
    playerlevels: true,
    payload: {
        publickey: "testpublickey",
        ip: "62.163.200.241"
    },
    request: {
        ip: "62.163.200.241",
        url: "https://g8bc7e3b77ce2446c.gdtk.playtomic.com/v1",

        headers: {
            "x-forwarded-for": "62.163.200.241"
        },
        connection: {
            remoteAddress: "62.163.200.241"
        }
    },
    response: {
        end: function(m) {
            return m;
        },
        writeHead: function(){
        }
    }
};