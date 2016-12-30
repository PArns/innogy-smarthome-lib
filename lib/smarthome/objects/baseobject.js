const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const Promise = require('bluebird');
const TypeParser = require('./../typeparser');

const utils = require(__dirname + "/../../utils");

// ----------------------- INIT -----------------------

function BaseObject(requestor) {
    EventEmitter.call(this);

    this._requestor = requestor;

    this._config = null;
    this._meta = null;
}

inherits(BaseObject, EventEmitter);
module.exports = BaseObject;

// ----------------------- CLASS FUNCTIONS -----------------------

BaseObject.prototype._emptyPromise = function (returnObject) {
    return new Promise(function (resolve) {
        resolve(returnObject ? returnObject : null);
    });
};

BaseObject.prototype.parseConfig = function (config) {
    this._config = config;
    var that = this;

    var typeParser = new TypeParser(that._requestor);

    Object.keys(config).forEach(function (key) {
        var val = config[key];

        if (typeof val === "string") {
            that[key] = val;
        } else if (Array.isArray(val)) {
            var index = 0;
            var idx = false;
            val.forEach(function (prop) {
                try {
                    if (key === "Location") {
                        that[key] = typeParser.getTypeClass(key);
                        that[key].value = prop.value;
                    } else if (key === "Tags") {
                        that[key] = that[key] || [];
                        var tag = typeParser.getTypeClass(key);

                        tag.name = prop.name;
                        tag.value = prop.value;

                        that[key].push(tag);
                    } else if (prop.name) {
                        that[key].forEach(function(entry) {
                            if (entry.name === prop.name) {
                                entry.value = prop.value;
                            }
                        });
                    } else {
                        idx = true;
                        that[key][index].value = prop.value;
                    }
                } catch (e) {
                    // TODO: Report wrong property types!
                    console.log("!!! ERR !!!" + e);
                    console.log("NAME", prop.name);
                    console.log("VALUE", prop.value);
                    console.log("KEY", key);
                }

                index++;
            });
        }
    });

    return this._emptyPromise(this);
};

BaseObject.prototype.parseMeta = function (meta) {
    var that = this;
    this._meta = meta;

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

BaseObject.prototype._bindProperties = function (propertyData) {
    var that = this;
    Object.keys(propertyData).forEach(function (key) {
        that[key] = propertyData[key];
    });
};

BaseObject.prototype.getParsedObject = function () {
    return this._emptyPromise(this);
};
