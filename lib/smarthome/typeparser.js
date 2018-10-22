const Promise = require('bluebird');
const utils = require("./../utils");

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

ShTypeParser.prototype.parseConfig = function (config) {
    var that = this;

    if (Array.isArray(config)) {
        var parser = [];
        var res = [];

        config.forEach(function (aConfig) {
            parser.push(that.parseConfig(aConfig).then(function (resultingObject) {
                res.push(resultingObject);
            }));
        });

        return Promise.all(parser).then(function () {
            return res;
        });
    } else {
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
            }, function(err, data) {
                console.log("FAILED", config.desc, err, data);
            });
        } else {
            return new Promise(function (resolve) {
                resolve(null);
            })
        }
    }
};