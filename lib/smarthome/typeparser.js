const Promise = require('bluebird');
const utils = require("./../utils");

// ----------------------- INIT -----------------------

function ShTypeParser(requestor) {
    this._requestor = requestor;
}

module.exports = ShTypeParser;

// ----------------------- CLASS FUNCTIONS -----------------------
ShTypeParser.prototype.getTypeClass = function (objectType) {
    var type = require("./objects/" + objectType.toLowerCase());
    return new type(this._requestor);
};

ShTypeParser.prototype.parseConfig = function (config) {
    var that = this;

    if (config.desc) {
        return utils.getDescriptorFile(config.desc, this._requestor).then(function (metaData) {
            var objectType = Object.keys(metaData)[0];

            if (objectType) {
                var instance = that.getTypeClass(objectType);

                return instance.parseMeta(metaData[objectType]).then(function () {
                    return instance.parseConfig(config).then(function () {
                        return instance.getParsedObject();
                    })
                });
            }
        });
    } else {
        return new Promise(function (resolve) {
            resolve(null);
        })
    }
};

ShTypeParser.prototype.parseType = function (propertyData) {
    var that = this;

    Object.keys(propertyData).forEach(function (key) {
        var val = propertyData[key];

        if (key === "$") {
            that._bindProperties(val, parent);
        } else {
            if (key.endsWith('s')) {
                parent[key] = [];
            } else {
                parent[key] = {};
            }

            var type = Object.keys(val[0])[0];

            if (type === "Property") {
                var prop = new PropertyParser(that._requestor);
                prop.parseProperty(val[0].Property, parent[key]);
            } else if (type === "Link") {
                var link = new LinkParser(that._requestor);
                link.parseLink(val[0].Link, parent[key]);
            } else {
                console.log("UNKNOWN TYPE" + type)
            }
        }
    });
};