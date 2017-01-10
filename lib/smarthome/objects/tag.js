const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Tag(smartHome, requestor) {
    Tag.super_.call(this, smartHome, requestor);
}

inherits(Tag, BaseObject);
module.exports = Tag;

// ----------------------- CLASS FUNCTIONS -----------------------