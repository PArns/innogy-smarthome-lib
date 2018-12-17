const inherits = require('util').inherits;
const BaseObject = require("./baseobject");
const Promise = require("bluebird");

const cast = require("./../../cast");

// ----------------------- INIT -----------------------

function Capability(smartHome, requestor) {
    Capability.super_.call(this, smartHome, requestor);

    this.id = null;
    this.type = null;
    this.desc = null;

    this.Device = [];
    this.Config = [];
    this.State = [];
}

inherits(Capability, BaseObject);
module.exports = Capability;

// ----------------------- CLASS FUNCTIONS -----------------------

Capability.prototype._getCorrectMetaName = function (aConfigName) {
    var propertyCorrection = {
        "LastKeyPressCounter": "LastKeyPressedCounter",
        "Rainfall": "RainGauge",
        "NoiseLevel": "Sound Meter"
    };

    if (propertyCorrection.hasOwnProperty(aConfigName))
        return propertyCorrection[aConfigName];

    return aConfigName;
};

Capability.prototype._updateStateByConfigObject = function (aConfigObject, stateChangedCallback) {
    var that = this;
    var configName = this._getCorrectMetaName(aConfigObject.name);

    var found = false;
    var names = "";

    var updateState = function(aState) {
        if (aState.name === configName || aState.name === aConfigObject.name) {
            var triggerCallback = aState.value !== aConfigObject.value;

            var changes = {
                name: aState.name,
                old: aState.value,
                new: aConfigObject.value
            };

            aState.value = aConfigObject.value;

            if (triggerCallback && stateChangedCallback)
                stateChangedCallback(that, changes);

            aState.lastchanged = new Date(aConfigObject.lastchanged);
            found = true;
        }
    };

    if (Array.isArray((this.State))) {
        this.State.forEach(function (aState) {
            names += "|" + aState.name + "|, ";
            updateState(aState);
        });
    } else {
        updateState(this.State);
    }

    if (!found) {
        console.log(">> COULD NOT FIND |" + configName + "| IN " + names);
        console.log("CONFIG", aConfigObject);
        console.log("STATE", this.State);
    }
};

Capability.prototype.parseConfig = function (config, stateChangedCallback) {
    if (!stateChangedCallback)
        Capability.super_.prototype.parseConfig.call(this, config);

    var that = this;

    this.id = config.id || this.id;
    this.type = config.type || this.type;
    this.desc = config.desc || this.desc;

    if (config.State) {
        config.State.forEach(function (aState) {
            that._updateStateByConfigObject(aState, stateChangedCallback);
        });
    }

    return this._emptyPromise(this);
};

Capability.prototype.parseEvent = function (event) {
    Capability.super_.prototype.parseEvent.call(this, event);

    var that = this;

    if (event.Properties) {
        event.Properties.forEach(function (aState) {
            that._updateStateByConfigObject(aState);
        });
    }

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

                if (state.access == "R") {
                    reject({error: "YOU CAN'T SET A READ ONLY CAPABILITY!"});
                    return;
                }

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