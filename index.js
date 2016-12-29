const SmartHome = require("./lib/smarthome");

const smartHome = new SmartHome();

smartHome.on("needsAuthorization", function (auth) {
    console.log(auth);
});

smartHome.initialize();
//smartHome.capability();
