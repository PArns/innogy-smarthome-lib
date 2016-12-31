const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Link() {
    Link.super_.call(this);

    this.value = null;
    this.desc = null;
}

inherits(Link, BaseObject);
module.exports = Link;

// ----------------------- CLASS FUNCTIONS -----------------------