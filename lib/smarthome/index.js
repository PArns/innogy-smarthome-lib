const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const WebSocketClient = require('./../websocketclient');
const Promise = require('bluebird');

const Requestor = require("./../requestor");
const ShTypeParser = require('./typeparser');

// ----------------------- INIT -----------------------

function SmartHome(config) {
    if (!(this instanceof SmartHome)) return new SmartHome();
    EventEmitter.call(this);

    var that = this;

    if (config.debug) {
        Promise.config({
            // Enable warnings
            warnings: true,
            // Enable long stack traces
            longStackTraces: true,
            // Enable cancellation
            cancellation: true,
            // Enable monitoring
            monitoring: true
        });
    }

    this._requestor = Requestor(config);
    this._parser = new ShTypeParser(this, this._requestor);
    this._authRunning = false;
    this._authServer = null;
    this._wsClient = null;
    this._checkAuthTimer = null;
    this._reinitCount = 0;

    this._receivedMessages = {};

    this._initialized = false;

    this._requestor.on("needsAuthorization", function (auth, error) {
        if (auth && auth.server) {
            that._authServer = auth.server;
            auth.server.on("error", (err) => {
                that.emit("error", 'Error while starting Authentication server: ' + err.message);
            });
        }
        that._authRunning = true;
        that.emit("needsAuthorization", auth, error);
    });

    this._requestor.on("invalidAuthorization", function (auth, error) {
        that._authRunning = false;
        that.emit("invalidAuthorization", auth, error);
    });

    this._requestor.on("needsMobileAccess", function() {
        that._authRunning = true;
        that.emit("needsMobileAccess");
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
    return this._requestor._oAuth2.getAuthorizationStartUri(this._requestor._config.oAuth2RedirectConfig.port || 3000);
};

SmartHome.prototype.startAuthorization = function (callback) {
    if (!this._authRunning) {
        var res = this._requestor._oAuth2.startAuthorization(this._requestor._config.oAuth2RedirectConfig.port || 3000, callback);
        this._authServer = res.server;
        res.server.on("error", (err) => {
            this.emit("error", 'Error while starting Authentication server: ' +  err.message);
        });
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

    this._reinitCount++;

    that._finalize();

    return that._location().then(function () {
        return that._capability().then(function () {
            return new Promise(resolve=> setTimeout(resolve, 1000)).then(function () {
                return that._capabilityStates().then(function () {
                    return that._device().then(function () {
                        return new Promise(resolve=> setTimeout(resolve, 1000)).then(function () {
                            return that._deviceStates().then(function () {
                                return that._messages().then(function () {
                                    that._startCheckAuthorization();
                                    that._initialized = true;
                                    that._reinitCount = 0;

                                    that.emit("initializationComplete", that);

                                    setTimeout(function () {
                                        that._startRealtimeUpdates().then(function () {
                                            for (const aMessage of Object.values(that._receivedMessages)) {
                                                that.emit("messageCreated", aMessage);
                                            }
                                        }, that._errorHandler);
                                    }, 1000);

                                    return that;
                                }, that._errorHandler);
                            }, that._errorHandler);
                        });
                    }, that._errorHandler);
                }, that._errorHandler);
            });
        }, that._errorHandler);
    }, that._errorHandler);
};

SmartHome.prototype.finalize = function () {
    this._finalize();
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

SmartHome.prototype.getDeviceByCapability = function(aCapability) {
  var res = null;
  var that = this;

  if (!aCapability || !aCapability.id)
      return null;

  this.device.forEach(function(aDevice) {
     var cap =  that.getObjectFromArrayById(aDevice.Capabilities, aCapability.id);

     if (cap)
         res = aDevice;
  });

  return res;
};

SmartHome.prototype.resolveLink = function (aLinkToResolve) {
    var res = null;

    if (aLinkToResolve && (typeof aLinkToResolve === "string")) {
        var objectData = aLinkToResolve.substr(1).split("/");

        if (objectData.length === 2) {

            var type = objectData[0];
            var id = objectData[1];

            if (this.hasOwnProperty(type)) {
                res = this.getObjectFromArrayById(this[type], id);
            }
        }
    }

    if (!res)
        console.log("COULD NOT RESOLVE", aLinkToResolve);

    return res;
};

// ----------------------- INTERNAL CLASS FUNCTIONS -----------------------

SmartHome.prototype._finalize = function () {
    if (this._wsClient) {
        try {
            this._wsClient.close();
        } catch (e) {
            // Ignore
        }

        this._wsClient = null;
    }

    if (this._authServer) {
        try {
            this._authServer.close();
        } catch (e) {
            // Ignore
        }
        this._authServer = null;
    }

    if (this._checkAuthTimer) {
        clearInterval(this._checkAuthTimer);
        this._checkAuthTimer = null;
    }
};

SmartHome.prototype._errorHandler = function (e, callee) {
    if (!this._initialized)
        return;

    var that = this;

    var checkCallee = function () {
        var res = null;

        if (callee)
            res = callee();

        if (res)
            return res;

        return null;
    };

    that.emit("debug", {type: "error_handler", data: e});

    if (e && e.statusCode) {
        switch (e.statusCode) {
            // Deauthorized
            case 403:
                that.emit("needsMobileAccess");
                that.finalize();
                return;
        }
    }

    if (e && e.error && e.error.errorcode) {
        switch (e.error.errorcode) {
            // Session already exists ...
            case 2006:
                return checkCallee();
            // Remote access not allowed ...
            case 2010:
                that.emit("needsMobileAccess");
                return that.finalize();
            // Session not found ...
            case 2012:
                return that._requestor.call("initialize").then(function (config) {
                    if (that.CurrentConfigurationVersion !== config.CurrentConfigurationVersion) {
                        return that.init().then(checkCallee, that._errorHandler);
                    } else {
                        return checkCallee();
                    }
                }, that._errorHandler);

            // Service timeout ...
            case 1002:
                return Promise.delay(30 * 1000).then(function () {
                    return that.init().then(checkCallee, that._errorHandler);
                });

            // Unknown error ...
            case 1000:
                that.finalize();

                return Promise.delay(60 * 1000).then(function () {
                    return that.init().then(checkCallee, that._errorHandler);
                });

            // SHC offline ...
            case 5006:
                this.emit("warning", {error: "SmartHomeClient is offline! Pleaae check your connection..."});

                that.finalize();

                return Promise.delay(5 * 60 * 1000).then(function () {
                    return that.init().then(checkCallee, that._errorHandler);
                });

            default:
                that.finalize();

                return Promise.delay(60 * 1000).then(function () {
                    return that.init().then(checkCallee, that._errorHandler);
                });
        }
    }
};

SmartHome.prototype._startCheckAuthorization = function () {
    var that = this;

    var hasChangedCapabilities = false;

    if (this._checkAuthTimer) {
        clearTimeout(this._checkAuthTimer);
        this._checkAuthTimer = null;
    }

    var updateCallback = function (capabilityChanged, changes) {
        hasChangedCapabilities = true;

        that.emit("debug", {type: "check_timer_detected_state_change", data: capabilityChanged});
        that.emit("stateChanged", capabilityChanged, changes);
    };

    var checkAuth = function (timerOnly) {

        if (that._checkAuthTimer) {
            clearTimeout(that._checkAuthTimer);
            that._checkAuthTimer = null;
        }

        // Generate a random between 0-30 to add this to the timer.
        // This prevents "syncing" timers on API problems
        var randomMinutes = Math.floor(Math.random() * Math.floor(31));
        var checkTimeout = 1000 * 60 * (30 + randomMinutes);

        that._checkAuthTimer = setTimeout(checkAuth, checkTimeout);

        if (timerOnly === true)
            return;

        hasChangedCapabilities = false;

        that.emit("debug", {type: "check_timer"});

        that._capabilityStates(updateCallback).catch(function (e) {
            return that._errorHandler(e);
        }).then(function (res) {

            that.emit("debug", {type: "check_timer_then"});

            if (hasChangedCapabilities) {
                that.emit("debug", {type: "reinit_realtime_updates_due_to_timer_detected_changes"});
                that._startRealtimeUpdates();
            }

            return res;
        });
    };

    checkAuth(true);
};

SmartHome.prototype._initialize = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        that._requestor.call("initialize").catch(function (e) {

            console.log(e);

            if (e && e.error && e.error.errorcode === 2006) {


                // Does not work atm as "uninitialize" is broken with the last patch ...
                /*return that.finalize().then(function () {
                    return that._requestor.call("initialize");
                });*/

                resolve();
            }
        }).then(function (config) {
            if (config) {
                that.CurrentConfigurationVersion = config.CurrentConfigurationVersion;

                return that._parser.parseConfig(config.Data[0]).then(function () {
                    resolve(config);
                    return config;
                });
            }
        }, reject);
    });
};


SmartHome.prototype._location = function () {
    var that = this;

    return this._requestor.call("location").then(function (config) {
        return that._parser.parseConfig("location", config).then(function (res) {
            that.location = res;
            return res;
        });
    });
};

SmartHome.prototype._device = function () {
    var that = this;

    return this._requestor.call("device").then(function (config) {
        return that._parser.parseConfig("device", config).then(function (res) {

            for (var dIndex in res) {
                var device = res[dIndex];

                // Resolve location ...
                if (device.location)
                    device.Location = that.resolveLink(device.location);

                // Resolve capabilities ...
                for (var cIndex in device.capabilities) {
                    var capId = device.capabilities[cIndex];

                    var cap = that.resolveLink(capId);

                    if (cap) {
                        device.Capabilities.push(cap);
                    }
                }
            }

            that.device = res;
            return res;
        });
    });
};

SmartHome.prototype._capability = function () {
    var that = this;

    return this._requestor.call("capability").then(function (config) {
        return that._parser.parseConfig("capability", config).then(function (res) {
            that.capability = res;
            return res;
        }, function(err) {
            console.log("CAP ERR", err);
        });
    });
};

SmartHome.prototype._capabilityStates = function (callback) {
    var that = this;
    var parser = [];

    return this._requestor.call("capability/states").then(function (config) {

        config.forEach(function (aConfig) {

            var cap = that.getCapabilityById(aConfig.id);

            if (cap) {
                parser.push(cap.parseConfig(aConfig, callback));
            }
        });

        return Promise.all(parser).then(function () {
            return that.capability;
        });
    });
};

SmartHome.prototype._deviceStates = function (callback) {
    var that = this;
    var parser = [];

    return this._requestor.call("device/states").then(function (config) {

        config.forEach(function (aConfig) {

            var dev = that.getDeviceById(aConfig.id);

            if (dev) {
                parser.push(dev.parseConfig(aConfig, callback));
            }
        });

        return Promise.all(parser).then(function () {
            return that.device;
        });
    });
};

SmartHome.prototype._messages = function () {
    var that = this;

    return this._requestor.call("message").then(function (messages) {

        messages.forEach(function (aMessage) {
            that._receivedMessages[aMessage.id] = aMessage;
        });

        return messages;
    });
};

SmartHome.prototype._startRealtimeUpdates = function () {
    var that = this;

    var deviceFoundTimer  = null;
    var restartTimer = null;

    var _handleRealTimeEvent = function(event, caller) {

        switch (event.type) {
            case "DeviceFound":
            case "ConfigChanged":
            case "/event/UserDataChanged":
                // Wait at least 10 seconds for new devices ...
                if (deviceFoundTimer)
                    clearTimeout(deviceFoundTimer);

                deviceFoundTimer = setTimeout(function () {
                    caller.init();
                }, 1000 * 10);
                break;
            case "Disconnect":
                if (restartTimer)
                    clearTimeout(restartTimer);

                restartTimer = setTimeout(function () {
                    caller.init();
                }, 1000 * 60);
                break;
            case "DeviceDiscoveryStatusChanged":
                break;
            case "MessageCreated":
                if (event.data && event.data.id) {
                    that._receivedMessages[event.data.id] = event.data;
                    caller.emit("messageCreated", event.data);
                }
                break;
            case "MessageDeleted":
                if (event.data && event.data.id) {
                    if (that._receivedMessages[event.data.id]) {
                        caller.emit("messageDeleted", Object.assign(that._receivedMessages[event.data.id], event.data));
                        delete that._receivedMessages[event.data.id];
                        break;
                    }
                    caller.emit("messageDeleted", event.data);
                }
                break;
            default:
                if (event && event.source) {
                    var cap = caller.resolveLink(event.source);

                    if (cap) {
                        cap.parseEvent(event);
                        caller.emit("stateChanged", cap);
                    }
                } else {
                    console.log("UNKNOWN EVENT TYPE", event.type);
                    console.log(JSON.stringify(event));
                }
                break;
        }
    };

    var createWebSocket = function(status) {

        var webSocketUri = 'wss://' + that._requestor._config.baseConfig.apiHost + that._requestor._config.baseConfig.versionPrefix + 'events?token=' + encodeURIComponent(status.token.access_token);

        // Do we use a local connection? In this case, we need to use ws, instead of wss!
        if (that._requestor._config.oAuth2Credentials &&
            that._requestor._config.oAuth2Credentials.local &&
            that._requestor._config.oAuth2Credentials.local.useLocalConnection)
            webSocketUri = 'ws://' + that._requestor._config.baseConfig.apiHost + ":" + that._requestor._config.oAuth2Credentials.local.eventsPort + that._requestor._config.baseConfig.versionPrefix + 'events?token=' + encodeURIComponent(status.token.access_token);

        var ws = new WebSocketClient(webSocketUri);

        ws.on('message', function (data) {
            var eventData = JSON.parse(data);

            that.emit("debug", {type: "realtime_update_received", data: eventData});

            if (Array.isArray(eventData)) {
                eventData.forEach(function (event) {
                    _handleRealTimeEvent(event, that);
                });
            } else {
                _handleRealTimeEvent(eventData, that);
            }
        });

        ws.on('open', function () {
            that.emit('open', {});
        });

        ws.on('reconnect', function () {
            that.emit('reconnect', {});
        });

        ws.on('error', function (e) {
            that.emit('error', e);
        });

        ws.on('close', function (e) {
            that.emit('close', {code: e});
        });

        that._wsClient = ws;
    };

    return new Promise(function (resolve, reject) {
        that._requestor._oAuth2.getAuthorizationStatus(function (error, status) {
            if (error || !status.token)
                reject(error);
            else {
                if (that._wsClient) {
                    try {
                        that._wsClient.close();
                        that._wsClient = null;
                    } catch (e) {
                        // Ignore
                    }
                }

                createWebSocket(status);
                resolve(that._wsClient);
            }
        });
    });
};
