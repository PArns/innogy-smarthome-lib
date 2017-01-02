const inherits = require('util').inherits;
const BaseObject = require("./baseobject");
const Promise = require("bluebird");

const cast = require("./../../cast");

// ----------------------- INIT -----------------------

function Capability(requestor) {
    Capability.super_.call(this, requestor);

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

Capability.prototype._updateStateByConfigObject = function (aConfigObject) {
    this.State.forEach(function (aState) {
        if (aState.name === aConfigObject.name) {
            aState.value = aConfigObject.value;
            aState.lastchanged = new Date(aConfigObject.lastchanged);
        }
    });
};

Capability.prototype.parseConfig = function (config) {
    Capability.super_.prototype.parseConfig.call(this, config);

    var that = this;

    this.id = config.id || this.id;
    this.type = config.type || this.type;
    this.desc = config.desc || this.desc;

    if (config.State) {
        config.State.forEach(function (aState) {
            that._updateStateByConfigObject(aState);
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

        if (that.Actions && that.Actions.length) {
            var foundSetStateAction = false;

            for (var x in that.Actions) {
                if (that.Actions[x].value === setStateDesc) {
                    foundSetStateAction = true;
                    break;
                }
            }

            if (!foundSetStateAction) {
                reject();
                return;
            }
        } else {
            reject();
            return;
        }

        if (that.State && that.State.length) {
            var state = that.State[0];

            if (stateName === undefined && state.name) {
                stateName = state.name;
            }

            if (state.type) {
                switch (state.type) {
                    case '/types/OnOff':
                        newState = cast(newState, "boolean");
                        break;
                    default:
                        console.log("UNKNOWN STATE TYPE '" + state.type + "'");
                        reject();
                        return false;
                        break;
                }
            }
        }

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

        that._requestor.call('action', "POST", stateObject).then(resolve, reject);
    });
};