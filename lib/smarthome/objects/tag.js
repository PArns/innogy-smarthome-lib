const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Tag(requestor) {
    Tag.super_.call(this, requestor);
}

inherits(Tag, BaseObject);
module.exports = Tag;

// ----------------------- CLASS FUNCTIONS -----------------------