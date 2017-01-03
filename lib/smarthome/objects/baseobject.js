const Promise = require('bluebird');
const TypeParser = require('./../typeparser');

const utils = require(__dirname + "/../../utils");

// ----------------------- INIT -----------------------

function BaseObject(requestor) {
    this._requestor = requestor;
}

module.exports = BaseObject;

// ----------------------- CLASS FUNCTIONS -----------------------

BaseObject.prototype._emptyPromise = function (returnObject) {
    return new Promise(function (resolve) {
        resolve(returnObject ? returnObject : null);
    });
};

BaseObject.prototype.parseConfig = function (config) {
    var that = this;

    var typeParser = new TypeParser(that._requestor);

    Object.keys(config).forEach(function (key) {
        var val = config[key];

        if (typeof val === "string") {
            that[key] = val;
        } else if (Array.isArray(val)) {

            // Replace the meta capabilities with the configuration ones
            // but only if config contains new capabilities!
            if (key === "Capabilities") {
                that[key] = [];
            }

            val.forEach(function (prop) {
                try {
                    if (key === "Location") {
                        // Replace the location object ...
                        that[key] = typeParser.getTypeClass("link");
                        that[key].value = prop.value;
                        that[key].desc = "/desc/Location";
                    } else if (key === "Capabilities") {
                        var link = typeParser.getTypeClass("link");
                        link.value = prop.value;
                        link.desc = "/desc/Capability";

                        that[key].push(link);
                    } else if (key === "Device") {
                        that[key] = typeParser.getTypeClass("link");
                        that[key].value = prop.value;
                        that[key].desc = "/desc/Device";
                    } else if (key === "Tags") {
                        that[key] = that[key] || [];
                        var tag = typeParser.getTypeClass("tag");

                        tag.name = prop.name;
                        tag.value = prop.value;

                        that[key].push(tag);
                    } else if (prop.name) {
                        that[key].forEach(function (entry) {
                            if (entry.name === prop.name) {
                                entry.value = prop.value;
                            }
                        });
                    } else {
                        console.log("!!!! ---- YOU SHOULD NEVER SEE THIS HERE ---- !!!!");
                        console.log("!!!! ---- UNKNOWN KEY FOUND ---- !!!!");
                        console.log("KEY", key, prop);
                        console.log("STATE", that[key]);
                    }
                } catch (e) {
                    // TODO: Report wrong property types!
                    console.log("!!! ERR !!! " + e);
                    console.log("PROP", prop);
                }
            });
        }
    });

    return this._emptyPromise(this);
};

BaseObject.prototype.parseMeta = function (meta) {
    var that = this;

    var parser = [];
    var resType = [];

    Object.keys(meta).forEach(function (key) {
        var value = meta[key];

        if (Array.isArray(value))
            value = value[0];

        if (key !== "$") {
            var typeClass = Object.keys(value)[0];
            var typeMeta = value[typeClass];

            var typeParser = new TypeParser(that._requestor);

            if (typeClass == "$") {
                var type = typeParser.getTypeClass(that.constructor.name.toLowerCase());

                type._bindProperties(typeMeta);
                resType.push(type);
            } else if (typeClass) {
                var type = typeParser.getTypeClass(typeClass);

                var t = type.parseMeta(typeMeta).then(function (res) {
                    that[key] = res;
                });

                parser.push(t);
            }
        } else {
            // Ignore self (origin caller) ...
            // console.log("KEY NOT $", value);
        }
    });

    return Promise.all(parser).then(function () {
        return resType;
    });
};

BaseObject.prototype.parseEvent = function (event) {
    return this._emptyPromise(this);
};

BaseObject.prototype.getName = function () {
    if (this.Config && this.Config.length) {
        for (var x in this.Config) {
            var property = this.Config[x];

            if (property.name.toLowerCase() === "name") {
                return property.getValue();
                break;
            }
        }
    }

    return null;
};

BaseObject.prototype._bindProperties = function (propertyData) {
    var that = this;

    Object.keys(propertyData).forEach(function (key) {
        that[key] = propertyData[key];
    });
};

BaseObject.prototype.getParsedObject = function () {
    return this._emptyPromise(this);
};