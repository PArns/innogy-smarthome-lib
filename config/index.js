// Set the configuration settings
const apiUri = 'https://api.services-smarthome.de';
const redirectHost = 'iobroker-connect.patrick-arns.de';

const credentials = {
    client: {
        id: '61768662',
        secret: 'no secret'
    },

    auth: {
        tokenHost: apiUri,
        authorizePath: '/AUTH/authorize',
        tokenPath: '/AUTH/token' // ??
    }
};

const redirectConfig = {
    host: redirectHost,
    uri: "https://" + redirectHost + "/",
    startUri : "https://" + redirectHost + "/start/"
};

module.exports = {
    oAuth2Credentials: credentials,
    oAuth2RedirectConfig: redirectConfig
};