const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Location(requestor) {
    Location.super_.call(this, requestor);
}

inherits(Location, BaseObject);
module.exports = Location;

// ----------------------- CLASS FUNCTIONS -----------------------