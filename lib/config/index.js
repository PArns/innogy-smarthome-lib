// Set the configuration settings
var createConfig = function (config) {
    const apiHost = 'api.services-smarthome.de';
    const apiUri = 'https://' + apiHost;

    const baseConfig = {
        apiUri: apiUri,
        apiHost: apiHost,
        versionPrefix: "/API/1.1/"
    };

    const credentials = {
        client: {
            id: config.id,
            secret: config.secret
        },

        auth: {
            tokenHost: apiUri,
            authorizePath: '/AUTH/authorize',
            tokenPath: '/AUTH/token'
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