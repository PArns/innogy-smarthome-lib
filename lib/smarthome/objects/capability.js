const inherits = require('util').inherits;
const BaseObject = require("./baseobject");
const Promise = require("bluebird");

const cast = require("./../../cast");

// ----------------------- INIT -----------------------

function Capability(smartHome, requestor) {
    Capability.super_.call(this, smartHome, requestor);

    this.id = null;
    this.type = null;
    this.device = null;
    this.config = null;

    this.State = [];
}

inherits(Capability, BaseObject);
module.exports = Capability;

// ----------------------- CLASS FUNCTIONS -----------------------


Capability.prototype._updateStateByConfigObject = function (aConfigObject, stateChangedCallback) {
    var that = this;

    for (const [key, value] of Object.entries(aConfigObject)) {

        var stateFound = false;
        var newLastChanged = new Date();

        if (value.lastChanged)
            newLastChanged = new Date(value.lastChanged);

        // Check for state update ...
        that.State.forEach(function(currentState) {
            if (currentState.name === key)
            {
                var timeDifference = Math.abs(currentState.lastchanged.getTime() - newLastChanged.getTime());

                var triggerCallback = currentState.value !== value ||
                    timeDifference !== 0;

                var changes = {
                    name: currentState.name,
                    old: currentState.value,
                    new: value
                };

                currentState.value = value;
                currentState.lastchanged = newLastChanged;

                if (triggerCallback && stateChangedCallback)
                    stateChangedCallback(that, changes);

                stateFound = true;
            }
        });

        // State not found ... Add a new one
        if (!stateFound) {
            var newState = {
                name: key,
                value: value.value,
                lastchanged: newLastChanged
            };

            that.State.push(newState);
        }
    }
};

Capability.prototype.parseConfig = function (config, stateChangedCallback) {
    if (!stateChangedCallback)
        Capability.super_.prototype.parseConfig.call(this, config);

    var that = this;

    this.id = config.id || this.id;
    this.type = config.type || this.type;
    this.device = config.device || this.device;
    this.config = config.config || this.config;

    if (config.state) {
        if (Array.isArray(config.state)) {
            config.state.forEach(function (aState) {
                that._updateStateByConfigObject(aState, stateChangedCallback);
            });
        } else {
            that._updateStateByConfigObject(config.state, stateChangedCallback);
        }
    }

    return this._emptyPromise(this);
};

Capability.prototype.parseEvent = function (event) {
    Capability.super_.prototype.parseEvent.call(this, event);

    var that = this;

    if (event.properties)
        that._updateStateByConfigObject(event.properties);

    return this._emptyPromise(this);
};


Capability.prototype.setState = function (newState, stateName) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var now = new Date();
        const setStateDesc = "/desc/device/SHC.RWE/1.0/action/SetState";

        if (that.State && that.State.length) {
            var state = null;

            if (stateName === undefined && that.State[0].name) {
                state = that.State[0];
            } else {
                for (var x in that.State) {
                    if (that.State[x].name.toLowerCase() === stateName.toLowerCase()) {
                        state = that.State[x];
                        break;
                    }
                }
            }

            if (state) {
                stateName = state.name;

                if (state.type) {
                    switch (state.type) {
                        case '/types/boolean':
                        case '/types/OnOff':
                            newState = cast(newState, "boolean");
                            break;
                        case '/types/decimal':
                        case '/types/TargetTemperature':
                            newState = cast(newState, "float");
                            break;
                        case '/types/integer':
                        case '/types/percent':
                        case '/types/DimmingLevel':
                        case '/types/ShutterLevel':
                            newState = cast(newState, "integer");
                            break;
                        case '/types/string':
                        case '/types/DisplayName':
                            newState = cast(newState, "string");
                            break;
                        case '/types/device/RST.RWE/1.1/OperationMode':
                            newState = cast(newState, "operationmode");
                            break;
                        case '/types/DateTime':
                            newState = new Date(newState).toISOString();
                            break;
                        case '/types/device/FSC8.RWE/1.1/ValveType':
                            newState = cast(newState, "valvetype");
                            break;
                        case '/types/device/FSC8.RWE/1.1/ControlMode':
                            newState = cast(newState, "controlmode");
                            break;
                        default:
                            console.log("UNKNOWN STATE TYPE '" + state.type + "'");
                            reject();
                            return false;
                            break;
                    }
                }
            } else {
                reject({error: "CAPABILITY NOT FOUND!"});
                return;
            }
        }

        if (newState !== null) {
            var stateObject =
                {
                    "desc": setStateDesc,
                    "timestamp": now.toISOString(),
                    "type": "device/SHC.RWE/1.0/action/SetState",
                    "Link": {
                        "value": "/capability/" + that.id
                    },
                    "Data": [
                        {
                            "name": stateName,
                            "type": "/entity/Constant",
                            "Constant": {
                                "value": newState
                            }
                        }
                    ]
                };

            that._requestor.call('action', "POST", stateObject).then(resolve, function (e) {
                that._smartHome._errorHandler(e, function () {
                    that.setState(newState, stateName).then(resolve, reject);
                });
            });
        } else {
            reject();
        }
    });
};