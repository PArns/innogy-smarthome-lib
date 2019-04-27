const inherits = require('util').inherits;
const BaseObject = require("./baseobject");
const Promise = require("bluebird");

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

        // Parse the right value out of var or value itself ...
        var theValue = value;

        if (typeof (value) === "object") {
            if (value.lastChanged)
                newLastChanged = new Date(value.lastChanged);

            theValue = value.value;
        }

        // Check for state update ...
        that.State.forEach(function (currentState) {
            if (currentState.name === key) {
                var timeDifference = Math.abs(currentState.lastchanged.getTime() - newLastChanged.getTime());

                var triggerCallback = currentState.value && currentState.value !== theValue ||
                    timeDifference !== 0;

                var changes = {
                    name: currentState.name,
                    old: currentState.value,
                    new: theValue
                };

                currentState.value = theValue;
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
                value: theValue,
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
            } else {
                reject({error: "CAPABILITY NOT FOUND!"});
                return;
            }
        }

        if (newState !== null) {
            const stateObject =
                {
                  "type": "SetState",
                  "namespace": "core.RWE",
                  "target": "/capability/" + that.id,
                  "params" :
                      {
                          [stateName]:
                              {
                                  "type": "Constant",
                                  "value": newState
                              }
                      }
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