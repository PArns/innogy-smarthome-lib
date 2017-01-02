const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Location(requestor) {
    Location.super_.call(this, requestor);

    this.id = null;
    this.desc = null;

    this.Config = [];
}

inherits(Location, BaseObject);
module.exports = Location;

// ----------------------- CLASS FUNCTIONS -----------------------

Location.prototype.parseConfig = function (config) {
    Location.super_.prototype.parseConfig.call(this, config);

    this.id = config.id || this.id;
    this.desc = config.desc || this.desc;

    return this._emptyPromise(this);
};