const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');
const WebSocketClient = require('./../websocketclient');
const Promise = require('bluebird');

const Requestor = require("./../requestor");
const ShTypeParser = require('./typeparser');

// ----------------------- INIT -----------------------

function SmartHome(config) {
    if (!(this instanceof SmartHome)) return new SmartHome();
    EventEmitter.call(this);

    var that = this;

    this._requestor = Requestor(config);
    this._parser = new ShTypeParser(this._requestor);
    this._authRunning = false;
    this._authServer = null;
    this._wsClient = null;
    this._checkAuthTimer = null;

    this._requestor.on("needsAuthorization", function (auth) {
        that._authRunning = true;
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

SmartHome.prototype.getAuthorizationUri = function () {
    return this._requestor._oAuth2.getAuthorizationStartUri(3000);

};

SmartHome.prototype.startAuthorization = function (callback) {
    if (!this._authRunning) {
        var res = this._requestor._oAuth2.startAuthorization(3000, callback);
        this._authServer = res.server;
        return res;
    } else
        return false;
};

SmartHome.prototype.init = function () {
    var that = this;

    this.CurrentConfigurationVersion = 0;
    this.device = [];
    this.capability = [];
    this.location = [];

    this.SHC = null;

    var errorHandler = function (e) {
        that.emit('error', e);
    };

    return that._initialize().then(function () {
        return that._location().then(function () {
            return that._capability().then(function () {
                return that._capabilityStates().then(function () {

                    that._startRealtimeUpdates().then(function () {
                    }, errorHandler);

                    return that._device().then(function () {
                        return that._deviceStates().then(function () {
                            that._startCheckAuthorization();
                            that.emit("initializationComplete", that);

                            return that;
                        }, errorHandler);
                    }, errorHandler);
                }, errorHandler);
            }, errorHandler);
        }, errorHandler);
    }, errorHandler);
};

SmartHome.prototype.finalize = function () {
    if (this._wsClient) {
        this._wsClient.close();
        this._wsClient = null;
    }

    if (this._authServer) {
        this._authServer.close();
        this._authServer = null;
    }

    if (this._checkAuthTimer) {
        clearInterval(this._checkAuthTimer);
        this._checkAuthTimer = null;
    }

    return this._uninitialize();
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

SmartHome.prototype.getDeviceById = function (aDeviceId) {
    return this.getObjectFromArrayById(this.device, aDeviceId);
};

SmartHome.prototype.resolveLink = function (aLinkToResolve) {
    var res = null;

    if (aLinkToResolve && (typeof aLinkToResolve.value === "string")) {
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

SmartHome.prototype._startCheckAuthorization = function () {
    var that = this;

    if (this._checkAuthTimer)
        clearInterval(this._checkAuthTimer);

    var updateCallback = function (capabilityChanged) {
        that.emit("stateChanged", capabilityChanged);
    };

    this._checkAuthTimer = setInterval(function () {
        that._capabilityStates(updateCallback).then(function () {
        }, function (e) {
            that.emit("error", e);
        });
    }, 1000 * 60 * 10);
};

SmartHome.prototype._initialize = function () {
    var that = this;
    return that._requestor.call("initialize").catch(function (e) {
        if (e.error.errorcode === 2006) {
            return that.finalize().then(function () {
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

                // Correct device location
                if (Array.isArray(device.Location)) {
                    device.Location = null;
                }
            }

            that.device = res;
            return res;
        });
    });
};

SmartHome.prototype._deviceStates = function () {
    var that = this;
    var parser = [];

    return this._requestor.call("device/states").then(function (config) {
        config.forEach(function (aConfig) {
            var device = that.getDeviceById(aConfig.Id);

            if (device)
                parser.push(device.parseConfig(aConfig));
        });

        return Promise.all(parser).then(function () {
            return that.device;
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

SmartHome.prototype._capabilityStates = function (callback) {
    var that = this;
    var parser = [];

    return this._requestor.call("capability/states").then(function (config) {
        config.forEach(function (aConfig) {
            var cap = that.getCapabilityById(aConfig.Id);

            if (cap) {
                parser.push(cap.parseConfig(aConfig, callback));
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
        that._requestor._oAuth2.getAuthorizationStatus(function (error, status) {
            if (error || !status.token)
                reject(error);
            else {
                var reconnectCount = 0;

                var ws = new WebSocketClient('wss://' + that._requestor._config.baseConfig.apiHost + that._requestor._config.baseConfig.versionPrefix + 'events?token=' + status.token.access_token);

                ws.on('message', function (data) {
                    var eventArray = JSON.parse(data);

                    if (Array.isArray(eventArray)) {
                        eventArray.forEach(function (event) {

                            if (event && event.link) {
                                var cap = that.resolveLink(event.link);

                                if (cap) {
                                    cap.parseEvent(event);
                                    that.emit("stateChanged", cap);
                                }
                            }
                        });
                    } else {
                        that.emit('error', eventArray);
                    }
                });

                ws.on('open', function () {
                    reconnectCount = 0;
                });

                ws.on('error', function (e) {
                    that.emit('error', e);
                });

                ws.on('close', function (e) {
                    if (e !== 1000)
                        that.emit('error', {error: "closing socket", code: e});
                    else
                        that.emit('close', {code: e});
                });

                that._wsClient = ws;
                resolve(ws);
            }
        });
    });
};