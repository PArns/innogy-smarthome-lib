const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Capability(requestor) {
    Capability.super_.call(this, requestor);
}

inherits(Capability, BaseObject);
module.exports = Capability;

// ----------------------- CLASS FUNCTIONS -----------------------