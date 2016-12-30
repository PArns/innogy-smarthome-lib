const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

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

    return this._emptyPromise();
};