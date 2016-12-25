const config = require("./config");
const oAuth2 = require("./lib/oauth2")(config);

oAuth2.getAuthorizationStatus(function (error, status) {
    if (status.needsAuthorization || !status.token) {
        var auth = oAuth2.startAuthorization(3000, function (err, token) {
            console.log(err, token);
        });

        console.log("PLEASE GO TO THE FOLLOWING URL TO START AUTH: " + auth.startUri);
    } else {
        console.log(status);
    }
});