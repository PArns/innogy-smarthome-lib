const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Location(smartHome, requestor) {
    Location.super_.call(this, smartHome, requestor);

    this.id = null;
    this.config = null;
}

inherits(Location, BaseObject);
module.exports = Location;

// ----------------------- CLASS FUNCTIONS -----------------------

Location.prototype.parseConfig = function (config) {
    Location.super_.prototype.parseConfig.call(this, config);

    this.id = config.id || this.id;
    this.config = config.config || this.config;

    return this._emptyPromise(this);
};