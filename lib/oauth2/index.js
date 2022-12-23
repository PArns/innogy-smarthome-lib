const jsonfile = require('jsonfile');
const express = require('express');
const https = require('https');
const http = require('http');
const querystring = require('querystring');
const ipHelper = require('./../ip');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');

const app = express();
let server = null;

const currentAuthFile = path.resolve(__dirname + "./../../data/auth/authorization.json");

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
            host: oAuthConfig.auth.host,
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

                if (jRes.access_token && jRes.expires_in) {
                    var now = new Date();
                    now.setSeconds(now.getSeconds() + jRes.expires_in);
                    jRes.expires_at = now;
                    delete(jRes.expires_in);

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

var getLocalAuthorizationCode = function(oAuthConfig) {
    return new Promise(function (resolve, reject) {
        var postData = JSON.stringify({
            grant_type: 'password',
            username: "admin", // Fixed string!!
            password: oAuthConfig.local.password
        });

        var postOptions = {
            host: oAuthConfig.auth.host, // contains only the IP ...
            port: 8080,
            path: oAuthConfig.auth.tokenPath,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': getAuthorizationHeaderToken(oAuthConfig.client.id, oAuthConfig.client.secret),
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };

        // Set up the request (local is http only!!)
        var httpReq = http.request(postOptions, function (httpRes) {
            var result = '';

            httpRes.on('data', function (chunk) {
                result += chunk;
            });

            httpRes.on('end', function () {
                var jRes = JSON.parse(result);

                if (jRes.access_token && jRes.expires_in) {
                    var now = new Date();
                    now.setSeconds(now.getSeconds() + jRes.expires_in);
                    jRes.expires_at = now;
                    delete(jRes.expires_in);

                    resolve(jRes);
                } else
                    reject({
                        serverRes: jRes,
                        postOptions: postOptions,
                        postData: postData,
                        authData: oAuthConfig
                    });
            });

            httpRes.on('error', function (err) {
                reject(err);
            })
        });

        httpReq.on('error', function (err) {
            reject(err);
        });

        httpReq.write(postData);
        httpReq.end();
    });
};

var getRefreshedToken = function (refreshToken, oAuthConfig) {
    return new Promise(function (resolve, reject) {
        var postData = querystring.stringify({
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            client_id: oAuthConfig.client.id,
            client_secret: oAuthConfig.client.secret
        });

        var postOptions = {
            host: oAuthConfig.auth.host,
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

                if (jRes.access_token && jRes.expires_in) {
                    var now = new Date();
                    now.setSeconds(now.getSeconds() + jRes.expires_in);
                    jRes.expires_at = now;
                    delete(jRes.expires_in);

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

var getAuthorizationHeaderToken = function (clientID, clientSecret) {
    return "Basic " + (Buffer.from(`${clientID}:${clientSecret}`).toString('base64'));
};

// ---------------------------------------------------------------------------------------------------------------------

var startAuthorization = function (oAuthConfig, oAuthRedirectConfig, port, tokenCallback) {

    // Local auth is done directly, no need to spin up a webserver ...
    if (oAuthConfig.local && oAuthConfig.local.useLocalConnection) {
        // Call local auth, there is no need for spinning up the webserver and redirect,
        // as we can auth locally towards the SHC
        getLocalAuthorizationCode(oAuthConfig, oAuthRedirectConfig).then(
            function (resData) {
                jsonfile.writeFile(currentAuthFile, resData, function () {
                    if (tokenCallback)
                        tokenCallback(null, resData);
                });
            }, function(error) {
                if (tokenCallback)
                    tokenCallback(error, null);
            }
        );

        // Exit here ...
        return;
    }

    // Remote authorization ...
    const startUri = getAuthorizationStartUri(oAuthConfig, oAuthRedirectConfig, port);

    if (!server) {

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
    }

    return {
        server: server,
        startUri: startUri
    };
};

var getAuthorizationStartUri = function (oAuthConfig, oAuthRedirectConfig, port) {
    const options = {
        redirect_uri: oAuthRedirectConfig.uri,
        response_type: 'code',
        client_id: oAuthConfig.client.id
    };

    const authorizationUri = `${oAuthConfig.auth.tokenHost}${oAuthConfig.auth.authorizePath}?${querystring.stringify(options)}`;
    const interfaces = ipHelper.getLocalIPs();
    const callbackUri = "http://" + interfaces[0] + ":" + port + "/authorize";

    const config = {
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
        console.log("OAUTH ERR", JSON.stringify(e));
    }

    return null;
};

var refreshToken = function (oAuthConfig, callback) {
    var cachedAuthorization = getCachedAuthorization();

    if (cachedAuthorization) {
        getRefreshedToken(cachedAuthorization.refresh_token, oAuthConfig).then(
            function (result) {
                if (result && result.access_token && result.refresh_token) {
                    jsonfile.writeFile(currentAuthFile, result, function () {
                        if (callback)
                            callback(null, {
                                needsAuthorization: false,
                                token: result
                            });
                    });
                } else if (callback) {
                    callback(null, {
                        needsAuthorization: true,
                        token: null
                    });
                }
            }, function (error) {
                if (callback) {
                    callback(null, {
                        needsAuthorization: true,
                        token: null
                    });
                }
            }
        );
    }
};

var getAuthorizationStatus = function (oAuthConfig, callback) {
    var cachedAuthorization = getCachedAuthorization();

    if (cachedAuthorization) {
        if (cachedAuthorization.expires_at) {
            var expirationDate = new Date(cachedAuthorization.expires_at);
            var now = new Date();

            // Refresh token 120 Mins before expiration date
            expirationDate.setMinutes(expirationDate.getMinutes() - 120);

            if (expirationDate < now) {
                refreshToken(oAuthConfig, function (error, result) {
                    if (callback)
                        callback(error, result);
                });
            } else {
                if (callback)
                    callback(null, {
                        needsAuthorization: false,
                        token: cachedAuthorization
                    });
            }
        } else if (callback) {
            callback(null, {
                needsAuthorization: true,
                token: null
            });
        }
    } else if (callback) {
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
