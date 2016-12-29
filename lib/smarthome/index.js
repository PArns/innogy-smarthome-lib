const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;

const Requestor = require("./../requestor");

const ShTypeParser = require('./typeparser');

// ----------------------- INIT -----------------------

function SmartHome() {
    if (!(this instanceof SmartHome)) return new SmartHome();
    EventEmitter.call(this);
    var that = this;

    this._requestor = Requestor();

    this._requestor.on("needsAuthorization", function (auth) {
        that.emit("needsAuthorization", auth);
    });

    this.devices = [];
    this.SHC = null;
    this.CurrentConfigurationVersion = 0;
}

inherits(SmartHome, EventEmitter);
module.exports = SmartHome;

// ----------------------- CLASS FUNCTIONS -----------------------

SmartHome.prototype.initialize = function () {
    var that = this;
    return that._requestor.call("initialize").catch(function (e) {
        if (e.error.errorcode === 2006) {
            return that.uninitialize().then(function () {
                return that._requestor.call("initialize");
            });
        }
    }).then(function (config) {
        that.CurrentConfigurationVersion = config.CurrentConfigurationVersion;

        var parser = new ShTypeParser(that._requestor);
        return parser.parseConfig(config.Data[0]).then(function (shc) {
            //console.log(shc);
            return config;
        });
    });
};

SmartHome.prototype.uninitialize = function () {
    return this._requestor.call("uninitialize");
};

SmartHome.prototype.capability = function () {
    var that = this;

    return this._requestor.call("capability").then(function (data) {
        console.log(data[0]);
    });
};