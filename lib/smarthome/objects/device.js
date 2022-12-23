const inherits = require('util').inherits;
const BaseObject = require('./baseobject');

// ----------------------- INIT -----------------------

function Device(smartHome, requestor) {
    Device.super_.call(this, smartHome, requestor);

    this.id = null;
    this.manufacturer = null;
    this.version = null;
    this.product = null;
    this.serialnumber = null;
    this.type = null;
    this.config = null;
    this.capabilities = null;
    this.tags = null;
    this.location = null;

    this.Capabilities = [];
    this.Location = null;

    this.Config = [];
    this.State = [];
}

inherits(Device, BaseObject);
module.exports = Device;

// ----------------------- CLASS FUNCTIONS -----------------------

Device.prototype._updateStateByConfigObject = function (aConfigObject, stateChangedCallback) {
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

Device.prototype.parseConfig = function (config, stateChangedCallback) {
    if (!stateChangedCallback)
        Device.super_.prototype.parseConfig.call(this, config);

    var that = this;

    this.id = config.id || this.id;
    this.manufacturer = config.manufacturer || this.manufacturer;
    this.version = config.version || this.version;
    this.product = config.product || this.product;
    this.serialnumber = config.serialnumber || this.serialnumber;
    this.config = config.config || this.config;
    this.type = config.type || this.type;
    this.capabilities = config.capabilities || this.capabilities;
    this.tags = config.tags || this.tags;
    this.location = config.location || this.location;

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
