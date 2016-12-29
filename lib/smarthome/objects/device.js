const inherits = require('util').inherits;
const BaseObject = require('./baseobject');

// ----------------------- INIT -----------------------

function Device(requestor) {
    Device.super_.call(this, requestor);

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

Device.prototype.parseConfig = function (config) {
    Device.super_.prototype.parseConfig.call(this, config);

    this.id = config.id;
    this.manufacturer = config.manufacturer;
    this.version = config.version;
    this.product = config.product;
    this.serialnumber = config.serialnumber;
    this.desc = config.desc;
    this.type = config.type;

    return this._emptyPromise();
};

Device.prototype.getParsedObject = function () {
    return this._emptyPromise(this);
};


