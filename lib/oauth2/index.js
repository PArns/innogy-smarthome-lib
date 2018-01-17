const jsonfile = require('jsonfile');
const express = require('express');
const oauthLib = require('simple-oauth2');
const https = require('https');
const querystring = require('querystring');
const ipHelper = require('./../ip');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');

const app = express();

const currentAuthFile = path.resolve(__dirname + "./../../data/auth/authorization.json");

var startAuthorization = function (oAuthConfig, oAuthRedirectConfig, port, tokenCallback) {
    const oauth2 = oauthLib.create(oAuthConfig);
    const startUri = getAuthorizationStartUri(oAuthConfig, oAuthRedirectConfig, port);

    var server = null;

    app.get('/', function (req, res) {
        return res
            .status(200)
            .json({startUri: startUri});
    });

    app.get('/authorize', function (req, res) {
        var code = req.query.code;

        if (!code) {
            return res
                .status(200)
                .json("Authorization code missing!");
        }

        getAuthorizationCode(code, oAuthConfig, oAuthRedirectConfig).then(
            function (resData) {
                jsonfile.writeFile(currentAuthFile, resData, function () {

                    setTimeout(function () {
                        server.close();
                    }, 5000);

                    res.status(200)
                        .json("Login complete! You can now close this window and the settings!");

                    if (tokenCallback)
                        tokenCallback(null, resData);
                });
            }, function (error) {
                res.json(error);
            }
        );
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

var getAuthorizationCode = function (requestCode, oAuthConfig, oAuthRedirectConfig) {
    return new Promise(function (resolve, reject) {
        var postData = querystring.stringify({
            code: requestCode,
            redirect_uri: oAuthRedirectConfig.uri,
            grant_type: 'authorization_code',
            client_id: oAuthConfig.client.id,
            client_secret: oAuthConfig.client.secret
        });

        var postOptions = {
            host: 'api.services-smarthome.de',
            path: oAuthConfig.auth.tokenPath,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': getAuthorizationHeaderToken(oAuthConfig.client.id, oAuthConfig.client.secret),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        // Set up the request
        var httpsReq = https.request(postOptions, function (httpsRes) {
            var result = '';

            httpsRes.on('data', function (chunk) {
                result += chunk;
            });

            httpsRes.on('end', function () {
                var jRes = JSON.parse(result);

                if (jRes.access_token) {
                    resolve(jRes);
                } else
                    reject({
                        serverRes: jRes,
                        postOptions: postOptions,
                        postData: postData,
                        authData: oAuthConfig
                    });
            });

            httpsRes.on('error', function (err) {
                reject(err);
            })
        });

        httpsReq.on('error', function (err) {
            reject(err);
        });

        httpsReq.write(postData);
        httpsReq.end();
    });
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

var getAuthorizationHeaderToken = function (clientID, clientSecret) {
    return "Basic " + (new Buffer(`${clientID}:${clientSecret}`).toString('base64'));
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