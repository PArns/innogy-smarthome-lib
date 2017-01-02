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

Property.prototype.getValue = function () {
    if (this.value)
        return this.value;
    else if (this.default)
        return this.default;
    else
        return null;
};

Property.prototype.parseConfig = function (config) {
    Property.super_.prototype.parseConfig.call(this, config);

    console.log(config);

    this.type = config.type;
    this.default = config.default ? config.default : null;
    this.access = config.access;
    this.value = null;
};