const os = require('os');

var getLocalIPs = function () {
    var ifaces = os.networkInterfaces();
    var res = [];

    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            res.push(iface.address);
        });
    });

    return res;
};

module.exports = {
    getLocalIPs: getLocalIPs
};