const jsonfile = require('jsonfile');
const express = require('express');
const oauthLib = require('simple-oauth2');
const ipHelper = require('./../ip');
const fs = require('fs');
const path = require('path');

const app = express();

const currentAuthFile = path.resolve(__dirname + "./../../data/auth/authorization.json");

var startAuthorization = function (oAuthConfig, oAuthRedirectConfig, port, tokenCallback) {
    const oauth2 = oauthLib.create(oAuthConfig);
    const startUri = getAuthorizationStartUri(oAuthConfig, oAuthRedirectConfig, port);

    var authorizationCompleted = false;
    var server = null;

    app.get('/', function (req, res) {
        return res
            .status(200)
            .json({startUri: startUri});
    });

    app.get('/authorize', function (req, res) {
        if (authorizationCompleted) {
            return res
                .sendFile(path.join(__dirname + '/authOk.html'));
        }

        var code = req.query.code;

        var options = {
            code: code,
            redirect_uri: oAuthRedirectConfig.uri
        };

        oauth2.authorizationCode.getToken(options, function (error, result) {
            if (error) {
                /*if (tokenCallback)
                    tokenCallback(error, null);*/

                setTimeout(function () {
                    server.close();
                }, 5000);

                return res.json(error);
            }

            authorizationCompleted = true;
            const token = oauth2.accessToken.create(result);

            jsonfile.writeFile(currentAuthFile, token.token, function () {
                if (tokenCallback)
                    tokenCallback(null, token.token);
            });

            setTimeout(function () {
                server.close();
            }, 5000);

            return res
                .sendFile(path.join(__dirname + '/authOk.html'));
        });
    });

    try {
        server = app.listen(port);
    } catch (e) {
        return e;
    }

    return {
        server: server,
        startUri: startUri
    };
};

var getAuthorizationStartUri = function (oAuthConfig, oAuthRedirectConfig, port) {
    const oauth2 = oauthLib.create(oAuthConfig);

    const authorizationUri = oauth2.authorizationCode.authorizeURL({
        redirect_uri: oAuthRedirectConfig.uri
    });

    var interfaces = ipHelper.getLocalIPs();
    var callbackUri = "http://" + interfaces[0] + ":" + port + "/authorize";

    var config = {
        authUri: authorizationUri,
        callbackUri: callbackUri
    };

    return oAuthRedirectConfig.startUri + "?s=" + encodeURIComponent(JSON.stringify(config));
};

var getCachedAuthorization = function () {
    try {
        if (fs.existsSync(currentAuthFile))
            return jsonfile.readFileSync(currentAuthFile);
    } catch (e) {
        console.log(JSON.stringify(e));
    }

    return null;
};

var refreshToken = function (oAuthConfig, callback) {
    const oauth2 = oauthLib.create(oAuthConfig);
    var cachedAuthorization = getCachedAuthorization();

    if (cachedAuthorization) {
        var token = oauth2.accessToken.create(cachedAuthorization);

        token.refresh(function (error, result) {
            if (result && result.token) {
                if (result.token.access_token && result.token.refresh_token)
                    jsonfile.writeFile(currentAuthFile, result.token, function () {
                        if (callback)
                            callback(error, {
                                needsAuthorization: false,
                                token: result.token
                            });
                    });
            } else if (callback)
                callback(error, {
                    needsAuthorization: true,
                    token: null
                });
        });
    }
};

var getAuthorizationStatus = function (oAuthConfig, callback) {
    const oauth2 = oauthLib.create(oAuthConfig);
    var cachedAuthorization = getCachedAuthorization();

    if (cachedAuthorization) {
        var token = oauth2.accessToken.create(cachedAuthorization);

        if (cachedAuthorization.expires_at) {
            var expirationDate = new Date(cachedAuthorization.expires_at);
            var now = new Date();

            // Refresh token 30 Mins before expiration date
            expirationDate.setMinutes(expirationDate.getMinutes() - 30);

            if (expirationDate < now) {
                token.refresh(function (error, result) {
                    if (result && result.token) {
                        jsonfile.writeFile(currentAuthFile, result.token, function () {
                            if (callback)
                                callback(error, {
                                    needsAuthorization: false,
                                    token: result.token
                                });
                        });
                    } else if (callback)
                        callback(error, {
                            needsAuthorization: true,
                            token: null
                        });
                });
            } else {
                if (callback)
                    callback(null, {
                        needsAuthorization: false,
                        token: cachedAuthorization
                    });
            }
        }
    } else {
        if (callback)
            callback(null, {
                needsAuthorization: true,
                token: null
            });
    }
};

module.exports = function (config) {
    return {
        getAuthorizationStatus: function (callback) {
            return getAuthorizationStatus(config.oAuth2Credentials, callback);
        },
        startAuthorization: function (port, callback) {
            return startAuthorization(config.oAuth2Credentials, config.oAuth2RedirectConfig, port, callback)
        },
        getAuthorizationStartUri: function (port) {
            return getAuthorizationStartUri(config.oAuth2Credentials, config.oAuth2RedirectConfig, port);
        },
        refreshToken: function (callback) {
            return refreshToken(config.oAuth2Credentials, callback);
        }
    }
};