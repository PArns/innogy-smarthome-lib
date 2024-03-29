const rp = require("request-promise");
const Promise = require("bluebird");

const createConfig = require("./../config");
const OAuth2 = require("./../oauth2");

const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;

const AsyncLock = require('async-lock');
var lock = new AsyncLock();

// ----------------------- INIT -----------------------

function Requestor(config) {
    if (!(this instanceof Requestor)) return new Requestor(config);

    this._config = createConfig(config);
    this._oAuth2 = OAuth2(this._config);
    this._lastCall = 0;

    this._maxCallsPerSecond = 4;

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
                var auth = that._oAuth2.startAuthorization(that._config.oAuth2RedirectConfig.port || 3000, function (err, token) {
                    if (err)
                    {
                        if (that._config.oAuth2Credentials.local.useLocalConnection)
                            that.emit("invalidAuthorization", auth);
                        else
                            reject(err, token);
                    } else
                        that.$doRequest(resolve, reject, token, options);
                });

                // Only emit, if we're not using a local config!
                if (!that._config.oAuth2Credentials.local.useLocalConnection)
                    that.emit("needsAuthorization", auth);
            } else {
                that.$doRequest(resolve, function (e) {
                    // This 401 (forbidden) occurs, if switching from cloud to local or if the user changed the PW!
                    // We need to completely reauthorize ...
                    if (e.statusCode === 401) {
                        var auth = that._oAuth2.startAuthorization(that._config.oAuth2RedirectConfig.port || 3000,function (err, token) {
                            if (err)
                                reject(err, token);
                            else
                                that.$doRequest(resolve, reject, token, options);
                        });

                        // Only emit, if we're not using a local config!
                        if (!that._config.oAuth2Credentials.local.useLocalConnection)
                            that.emit("needsAuthorization", auth, error);

                    } else if (e.statusCode === 403) {
                        that._oAuth2.refreshToken(function (error, refreshStatus) {
                            if (error) {
                                var auth = that._oAuth2.startAuthorization(that._config.oAuth2RedirectConfig.port || 3000, function (err, token) {
                                    if (err)
                                        reject(err, token);
                                    else
                                        that.$doRequest(resolve, reject, token, options);
                                });

                                // Only emit, if we're not using a local config!
                                if (!that._config.oAuth2Credentials.local.useLocalConnection)
                                    that.emit("needsAuthorization", auth, error);
                            }
                            else
                                that.$doRequest(resolve, reject, refreshStatus.token, options);
                        });
                    } else if (e && e.error && e.error.errorcode) {
                        // Token expired ...
                        if (e.error.errorcode === 2007) {
                            that._oAuth2.refreshToken(function (error, refreshStatus) {
                                if (error)
                                    reject(error, refreshStatus);
                                else
                                    that.$doRequest(resolve, reject, refreshStatus.token, options);
                            });
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
                var auth = that._oAuth2.startAuthorization(that._config.oAuth2RedirectConfig.port || 3000, function (err, token) {
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

Requestor.prototype.refreshToken = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        that._oAuth2.refreshToken(function (err, data) {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
};

// ----------------------- GLOBAL FUNCTIONS -----------------------

Requestor.prototype.$doRequest = function (resolve, reject, token, options) {

    var that = this;

    lock.acquire("REQUEST", function(done) {
        options = options || {};
        options.headers = options.headers || {};

        if (token)
            options.headers.Authorization = token.token_type + " " + token.access_token;

        var retries = 0;
        var waitingTime = 1000 / that._maxCallsPerSecond;

        var callRequest = function() {
            var now = new Date();
            var lastCallDiff = now - that._lastCall;

            if (that._lastCall == 0 ||  lastCallDiff > waitingTime) {
                rp(options).then(function (data) {

                    done();
                    that._lastCall = new Date();

                    resolve(data);
                }, function (error) {

                    console.log("ERR", error);

                    if (error && error.statusCode) {
                        // Too many requests detected ...
                        // So retry this call
                        if (error.statusCode == 429) {
                            retries++;

                            if (retries < 5) {
                                setTimeout(callRequest, waitingTime);
                                return;
                            }
                            // Mobile access is expired!
                        } else if (error.statusCode == 403) {
                            that.emit("needsMobileAccess");
                        } else if (error.statusCode == 401) {
                            that.emit("invalidAuthorization")
                        } else if (error.statusCode == 400) {
                            that.emit("error", error);
                        }
                    }

                    done();
                    reject(error);
                });
            } else {
                setTimeout(callRequest, waitingTime - lastCallDiff);
            }
        };

        callRequest();
    });
};
