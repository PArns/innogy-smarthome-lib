const SmartHome = require("./lib/smarthome");

const config = {
    redirectHost: 'iobroker-connect.patrick-arns.de',
    id: '61768662',
    secret: 'no secret'
};

const smartHome = new SmartHome(config);

smartHome.on("needsAuthorization", function (auth) {
    console.log(auth);
});

smartHome.on("stateChanged", function (objectWhichStateHasChanged) {
    console.log("stateChanged");
});

smartHome.on("initializationComplete", function () {
    console.log("INITIALIZATION SEQUENCE COMPLETED");

    if (smartHome.device && smartHome.device.length) {
        console.log("LIST OF ALL REGISTERED DEVICES:");

        smartHome.device.forEach(function (aDevice) {
            console.log("----------------------------------------");

            console.log("ID:", aDevice.id);
            console.log("Type:", aDevice.type);
            console.log("Name:", aDevice.getName()); // Helper needed, as name is stored within configuration!

            if (aDevice.Location)
                console.log("Location:", aDevice.Location.getName()); // Helper needed, as name is stored within configuration!

            console.log("- CAPABILITIES:");

            aDevice.Capabilities.forEach(function (aCapability) {
                console.log("    ID:", aCapability.id);
                console.log("    Type:", aCapability.type);

                if (aCapability.Config.length) {
                    console.log("    - CONFIG:");

                    aCapability.Config.forEach(function (aState) {
                        console.log("        Name:", aState.name);
                        console.log("        Type:", aState.type);
                        console.log("        Access:", aState.access);
                        console.log("        Value:", aState.value);
                        console.log("        LastChanged:", aState.lastchanged);

                    });
                }

                if (aCapability.State.length) {
                    console.log("    - STATES:");

                    aCapability.State.forEach(function (aState) {
                        console.log("        Name:", aState.name);
                        console.log("        Type:", aState.type);
                        console.log("        Access:", aState.access);
                        console.log("        Value:", aState.value);
                        console.log("        LastChanged:", aState.lastchanged);

                    });
                }
            });
        });
    }
});

smartHome.init();