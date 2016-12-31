const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');
const Promise = require('bluebird');

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
    this.device = [];
    this.capability = [];
    this.location = [];

    this.SHC = null;
}

inherits(SmartHome, EventEmitter);
module.exports = SmartHome;

// ----------------------- CLASS FUNCTIONS -----------------------

SmartHome.prototype.init = function () {
    var that = this;
    var init = [];

    return that._initialize().then(function () {
        init.push(that._location());
        init.push(that._device());

        init.push(that._capability().then(function () {
            return that._capabilityStates().then(function () {
                return that._startRealtimeUpdates();
            });
        }));

        return Promise.all(init).then(function () {
            that.emit("initializationComplete", that);
            return that;
        });
    });
};

SmartHome.prototype.getObjectFromArrayById = function (aArray, aObjectId) {
    var res = null;

    for (var vIndex in aArray) {
        var aObject = aArray[vIndex];

        if (aObject.id === aObjectId) {
            res = aObject;
            break;
        }
    }

    return res;
};

SmartHome.prototype.getCapabilityById = function (aCapabilityId) {
    return this.getObjectFromArrayById(this.capability, aCapabilityId);
};

SmartHome.prototype.resolveLink = function (aLinkToResolve) {
    var res = null;

    if (typeof aLinkToResolve.value === "string") {
        var objectLink = aLinkToResolve.value;

        var objectData = objectLink.substr(1).split("/");

        if (objectData.length == 2) {

            var type = objectData[0];
            var id = objectData[1];

            if (this.hasOwnProperty(type)) {
                res = this.getObjectFromArrayById(this[type], id);
            }
        }
    }

    return res;
};

// ----------------------- INTERNAL CLASS FUNCTIONS -----------------------

SmartHome.prototype._initialize = function () {
    var that = this;
    return that._requestor.call("initialize").catch(function (e) {
        if (e.error.errorcode === 2006) {
            return that._uninitialize().then(function () {
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

SmartHome.prototype._uninitialize = function () {
    return this._requestor.call("uninitialize");
};

SmartHome.prototype._location = function () {
    var that = this;

    return this._requestor.call("location").then(function (config) {
        return that._parser.parseConfig(config).then(function (res) {
            that.location = res;
            return res;
        });
    });
};

SmartHome.prototype._device = function () {
    var that = this;

    return this._requestor.call("device").then(function (config) {
        return that._parser.parseConfig(config).then(function (res) {

            // Resolve links ...
            for (var dIndex in res) {
                var device = res[dIndex];

                Object.keys(device).forEach(function (key) {
                    var value = device[key];

                    if (Array.isArray(value)) {
                        for (var vIndex in value) {
                            var property = value[vIndex];

                            if (typeof property === "object" && property.constructor.name === "Link") {
                                var link = that.resolveLink(property);

                                if (link)
                                    res[dIndex][key][vIndex] = link;
                            }
                        }
                    } else if (typeof value === "object" && value.constructor.name === "Link") {
                        var link = that.resolveLink(value);

                        if (link)
                            res[dIndex][key] = link;
                    }
                });
            }

            that.device = res;
            return res;
        });
    });
};

SmartHome.prototype._capability = function () {
    var that = this;

    return this._requestor.call("capability").then(function (config) {
        return that._parser.parseConfig(config).then(function (res) {
            that.capability = res;
            return res;
        });
    });
};

SmartHome.prototype._capabilityStates = function () {
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
            return that.capability;
        });
    });
};

SmartHome.prototype._startRealtimeUpdates = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        oAuth2.getAuthorizationStatus(function (error, status) {
            if (error || !status.token)
                reject(error);
            else {
                var ws = new WebSocket('wss://' + config.baseConfig.apiHost + config.baseConfig.versionPrefix + 'events?token=' + status.token.access_token);

                ws.on('message', function (data) {
                    var eventArray = JSON.parse(data);

                    eventArray.forEach(function (event) {
                        if (event && event.link) {
                            var cap = that.resolveLink(event.link);

                            if (cap) {
                                cap.parseEvent(event);
                                that.emit("stateChanged", cap);
                            }
                        }

                    });
                });

                that._wsClient = ws;
                resolve(ws);
            }
        });
    });
};