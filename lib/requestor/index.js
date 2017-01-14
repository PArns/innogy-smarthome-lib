const rp = require("request-promise");
const Promise = require("bluebird");

const createConfig = require("./../config");
const OAuth2 = require("./../oauth2");

const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;

// ----------------------- INIT -----------------------

function Requestor(config) {
    if (!(this instanceof Requestor)) return new Requestor(config);

    this._config = createConfig(config);
    this._oAuth2 = OAuth2(this._config);

    EventEmitter.call(this);
}

inherits(Requestor, EventEmitter);
module.exports = Requestor;

// ----------------------- CLASS FUNCTIONS -----------------------

Requestor.prototype.call = function (relativeUriToCall, method, body, parseAsJson) {
    var uri = this._config.baseConfig.apiUri + this._config.baseConfig.versionPrefix + relativeUriToCall;

    if (method === undefined)
        method = "GET";

    if (parseAsJson === undefined)
        parseAsJson = true;

    var options = {
        method: method,
        uri: uri,
        body: body,
        json: parseAsJson
    };

    return this.doRequest(options);
};

Requestor.prototype.doRequest = function (options) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that._oAuth2.getAuthorizationStatus(function (error, status) {
            if (status.needsAuthorization || !status.token) {
                var auth = that._oAuth2.startAuthorization(3000, function (err, token) {
                    if (err)
                        reject(err, token);
                    else
                        $doRequest(resolve, reject, token, options);
                });

                that.emit("needsAuthorization", auth);
            } else {
                $doRequest(resolve, function (e) {
                    if (e && e.error && e.error.errorcode) {
                        // Token expired ...
                        if (e.error.errorcode === 2007) {
                            that._oAuth2.refreshToken(function () {
                                $doRequest(resolve, reject, status.token, options);
                            })
                        } else {
                            reject(e);
                        }
                    } else {
                        reject(e);
                    }
                }, status.token, options);
            }
        });
    });
};

Requestor.prototype.checkAuthorization = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        that._oAuth2.getAuthorizationStatus(function (error, status) {
            if (status.needsAuthorization || !status.token) {
                var auth = that._oAuth2.startAuthorization(3000, function (err, token) {
                    if (err)
                        reject(err, token);
                    else
                        resolve();
                });

                that.emit("needsAuthorization", auth);
                reject();
            } else {
                resolve();
            }
        });
    });
};

// ----------------------- GLOBAL FUNCTIONS -----------------------

var $doRequest = function (resolve, reject, token, options) {
    options = options || {};
    options.headers = options.headers || {};

    options.headers.Authorization = token.token_type + " " + token.access_token;

    rp(options).then(resolve, reject);
};