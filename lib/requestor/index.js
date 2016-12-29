const rp = require("request-promise");
const Promise = require("bluebird");

const config = require("./../../config");
const oAuth2 = require("./../oauth2")(config);

const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;

// ----------------------- INIT -----------------------

function Requestor() {
    if (!(this instanceof Requestor)) return new Requestor();
    EventEmitter.call(this);
}

inherits(Requestor, EventEmitter);
module.exports = Requestor;

// ----------------------- CLASS FUNCTIONS -----------------------

Requestor.prototype.call = function (relativeUriToCall, method, parseAsJson, body) {
    var uri = config.baseConfig.apiUri + config.baseConfig.versionPrefix + relativeUriToCall;

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
    var self = this;

    return new Promise(function (resolve, reject) {
        oAuth2.getAuthorizationStatus(function (error, status) {
            if (status.needsAuthorization || !status.token) {
                var auth = oAuth2.startAuthorization(3000, function (err, token) {
                    if (err)
                        reject(err, token);
                    else
                        $doRequest(resolve, reject, token, options);
                });

                self.emit("needsAuthorization", auth);
            } else {
                $doRequest(resolve, reject, status.token, options);
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