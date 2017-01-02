const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Property(requestor) {
    Property.super_.call(this, requestor);

    this.type = null;
    this.default = null;
    this.access = null;
    this.value = null;
}

inherits(Property, BaseObject);
module.exports = Property;

// ----------------------- CLASS FUNCTIONS -----------------------

Property.prototype._parseProperty = function (config) {
    this.type = config.type;
    this.default = config.default ? config.default : null;
    this.access = config.access;
    this.value = null;
};