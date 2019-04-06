const Promise = require('bluebird');

// ----------------------- INIT -----------------------

function BaseObject(smartHome, requestor) {
    this._requestor = requestor;
    this._smartHome = smartHome;
}

module.exports = BaseObject;

// ----------------------- CLASS FUNCTIONS -----------------------

BaseObject.prototype._emptyPromise = function (returnObject) {
    return new Promise(function (resolve) {
        resolve(returnObject ? returnObject : null);
    });
};

BaseObject.prototype.parseConfig = function (config) {
    return this._emptyPromise(this);
};

BaseObject.prototype.parseEvent = function (event) {
    return this._emptyPromise(this);
};

BaseObject.prototype.getName = function () {
    if (this.config) {
        for (const [key, value] of Object.entries(this.config)) {
            if (key.toLowerCase() === "name")
                return value;
        }
    }

    return null;
};

BaseObject.prototype.getParsedObject = function () {
    return this._emptyPromise(this);
};