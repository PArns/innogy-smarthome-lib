const inherits = require('util').inherits;
const BaseObject = require('./baseobject');

// ----------------------- INIT -----------------------

function Device() {
    Device.super_.call(this);

    this.id = null;
    this.manufacturer = null;
    this.version = null;
    this.product = null;
    this.serialnumber = null;
    this.desc = null;
    this.type = null;

    this.Devices = [];
    this.Capabilities = [];
    this.Location = null;
    this.Config = [];
    this.State = [];
    this.Tags = [];
    this.Actions = [];
    this.Events = [];
    this.Messages = [];
}

inherits(Device, BaseObject);
module.exports = Device;

// ----------------------- CLASS FUNCTIONS -----------------------

Device.prototype._updateStateByConfigObject = function (aConfigObject) {
    this.State.forEach(function (aState) {
        if (aState.name === aConfigObject.name) {
            aState.value = aConfigObject.value;
            aState.lastchanged = new Date(aConfigObject.lastchanged);
        }
    });
};

Device.prototype.parseConfig = function (config) {
    Device.super_.prototype.parseConfig.call(this, config);
    var that = this;

    this.id = config.id || this.id;
    this.manufacturer = config.manufacturer || this.manufacturer;
    this.version = config.version || this.version;
    this.product = config.product || this.product;
    this.serialnumber = config.serialnumber || this.serialnumber;
    this.desc = config.desc || this.desc;
    this.type = config.type || this.type;

    if (config.State) {
        config.State.forEach(function (aState) {
            that._updateStateByConfigObject(aState);
        });
    }

    return this._emptyPromise(this);
};