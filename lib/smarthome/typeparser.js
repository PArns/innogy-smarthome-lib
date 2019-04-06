const Promise = require('bluebird');

// ----------------------- INIT -----------------------

function ShTypeParser(smartHome, requestor) {
    this._smartHome = smartHome;
    this._requestor = requestor;
}

module.exports = ShTypeParser;

// ----------------------- CLASS FUNCTIONS -----------------------
ShTypeParser.prototype.getTypeClass = function (objectType) {
    var type = require("./objects/" + objectType.toLowerCase());
    return new type(this._smartHome, this._requestor);
};

ShTypeParser.prototype.parseConfig = function (type, config) {
    var that = this;

    if (Array.isArray(config)) {
        var parser = [];
        var res = [];

        config.forEach(function (aConfig) {
            parser.push(that.parseConfig(type, aConfig).then(function (resultingObject) {
                res.push(resultingObject);
            }));
        });

        return Promise.all(parser).then(function () {
            return res;
        });
    } else {
        // Get correct type class ...
        var instance = that.getTypeClass(type);

        return instance.parseConfig(config).then(function () {
            return instance.getParsedObject();
        });
    }
};