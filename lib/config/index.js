// Set the configuration settings
var createConfig = function (config) {
    var apiHost = 'api.services-smarthome.de';
    var authHost = 'auth.services-smarthome.de';
    var apiUri = 'https://' + apiHost;
    var authUri = 'https://' + authHost;

    var versionPrefix = "/API/1.1/";
    var authPrefix = "AUTH";

    // Use local config? So override URLs
    if (config.localConnection && config.localShc && config.localPassword) {
        apiHost = config.localShc;
        authHost = config.localShc;

        // There is only HTTP support, sorry for that!
        apiUri = 'http://' + apiHost + ":8080";
        authUri = 'http://' + authHost + ":8080";

        versionPrefix = "/";

        // Override with generic auth (temp only during beta??)
        config.id = "clientId";
        config.secret = "clientPass";

        authPrefix = "auth"; // it's case senstive (whyever!)
    }

    const baseConfig = {
        apiUri: apiUri,
        apiHost: apiHost,
        versionPrefix: versionPrefix
    };

    const credentials = {
        client: {
            id: config.id,
            secret: config.secret
        },

        auth: {
            host: authHost,
            tokenHost: authUri,
            authorizePath: '/' + authPrefix + '/authorize',
            tokenPath: '/' + authPrefix + '/token'
        },

        local: {
            useLocalConnection: config.localConnection || false,
            password: config.localPassword
        }
    };

    const redirectConfig = {
        host: config.redirectHost,
        uri: "https://" + config.redirectHost + "/",
        startUri: "https://" + config.redirectHost + "/start/"
    };

    return {
        baseConfig: baseConfig,
        oAuth2Credentials: credentials,
        oAuth2RedirectConfig: redirectConfig
    }
};

module.exports = createConfig;