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

Device.prototype.parseConfig = function (config) {
    Device.super_.prototype.parseConfig.call(this, config);

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

    return this._emptyPromise(this);
};