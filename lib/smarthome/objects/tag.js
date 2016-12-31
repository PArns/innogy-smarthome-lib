const inherits = require('util').inherits;
const BaseObject = require("./baseobject");

// ----------------------- INIT -----------------------

function Tag() {
    Tag.super_.call(this);
}

inherits(Tag, BaseObject);
module.exports = Tag;

// ----------------------- CLASS FUNCTIONS -----------------------