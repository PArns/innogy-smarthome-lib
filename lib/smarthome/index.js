const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');

const Requestor = require("./../requestor");
const ShTypeParser = require('./typeparser');
const config = require('./../../config');
const oAuth2 = require("./../oauth2")(config);

// ----------------------- INIT -----------------------

function SmartHome() {
    if (!(this instanceof SmartHome)) return new SmartHome();
    EventEmitter.call(this);

    var that = this;

    this._requestor = Requestor();
    this._parser = new ShTypeParser(this._requestor);

    this._requestor.on("needsAuthorization", function (auth) {
        that.emit("needsAuthorization", auth);
    });

    this.CurrentConfigurationVersion = 0;
    this.devices = [];
    this.capabilities = [];

    this.SHC = null;
}

inherits(SmartHome, EventEmitter);
module.exports = SmartHome;

// ----------------------- CLASS FUNCTIONS -----------------------

SmartHome.prototype.initialize = function () {
    var that = this;
    return that._requestor.call("initialize").catch(function (e) {
        if (e.error.errorcode === 2006) {
            return that.uninitialize().then(function () {
                return that._requestor.call("initialize");
            });
        }
    }).then(function (config) {
        that.CurrentConfigurationVersion = config.CurrentConfigurationVersion;

        var parser = new ShTypeParser(that._requestor);
        return parser.parseConfig(config.Data[0]).then(function (shc) {
            return config;
        });
    });
};

SmartHome.prototype.uninitialize = function () {
    return this._requestor.call("uninitialize");
};

SmartHome.prototype.capability = function () {
    var that = this;

    return this._requestor.call("capability").then(function (config) {
        return that._parser.parseConfig(config).then(function (res) {
            that.capabilities = res;
            return res;
        });
    });
};

SmartHome.prototype.getCapabilityById = function (aCapabilityId) {
    var res = null;

    this.capabilities.forEach(function (aCapability) {
        if (aCapability.id === aCapabilityId) {
            res = aCapability;
        }
    });

    return res;
};

SmartHome.prototype.capabilityStates = function () {
    var that = this;
    var parser = [];

    return this._requestor.call("capability/states").then(function (config) {
        config.forEach(function (aConfig) {
            var cap = that.getCapabilityById(aConfig.Id);

            if (cap) {
                parser.push(cap.parseConfig(aConfig));
            }
        });

        return Promise.all(parser).then(function () {
            return that.capabilities;
        });
    });
};

SmartHome.prototype.startRealtimeUpdates = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        oAuth2.getAuthorizationStatus(function (error, status) {
            if (error || !status.token)
                reject(error);
            else {
                var ws = new WebSocket('wss://' + config.baseConfig.apiHost + config.baseConfig.versionPrefix + 'events?token=' + status.token.access_token);

                ws.on('message', function (data) {
                    console.log("WS DATA", JSON.parse(data));
                });

                that._wsClient = ws;
                resolve(ws);
            }
        });
    });
};