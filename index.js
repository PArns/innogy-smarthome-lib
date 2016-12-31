const SmartHome = require("./lib/smarthome");

const smartHome = new SmartHome();

smartHome.on("needsAuthorization", function (auth) {
    console.log(auth);
});

smartHome.on("stateChanged", function (objectWhichStateHasChanged) {
    console.log("stateChanged");
});

smartHome.on("initializationComplete", function () {
    console.log("INIT COMPLETE!");
});

smartHome.init();