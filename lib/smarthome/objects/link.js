const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Link(requestor) {
    Link.super_.call(this, requestor);

    this.value = null;
}

inherits(Link, BaseObject);
module.exports = Link;

// ----------------------- CLASS FUNCTIONS -----------------------