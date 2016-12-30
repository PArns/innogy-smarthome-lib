const SmartHome = require("./lib/smarthome");

const smartHome = new SmartHome();

smartHome.on("needsAuthorization", function (auth) {
    console.log(auth);
});

smartHome.initialize().then(function () {
    smartHome.capability().then(function () {
        smartHome.capabilityStates().then(function () {
            smartHome.startRealtimeUpdates();
        });
    });
});
