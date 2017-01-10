const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Link(smartHome, requestor) {
    Link.super_.call(this, smartHome, requestor);

    this.value = null;
    this.desc = null;
}

inherits(Link, BaseObject);
module.exports = Link;

// ----------------------- CLASS FUNCTIONS -----------------------