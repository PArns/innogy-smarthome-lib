# Innogy SmartHome Client API Node.js Library

The JavaScript library for using the Innogy SmartHome system.

The library abstracts the RESTful Innogy SmartHome Client API in a platform independent JavaScript library, which is distributed for applications using Node.js or the browser.

## Using the Library

```JavaScript

const SmartHome = require("./lib/smarthome");

const config = {
    redirectHost: 'www.example.com',    // define your redirect host here (set by innogy, without http/https)
    id: '1234567890',                   // oAuth2 ID (to be requested from innogy)
    secret: 'SECRET'                    // oAuth2 secret (to be requested from innogy)
};

const smartHome = new SmartHome(config);

smartHome.on("needsAuthorization", function (auth) {
    console.log(auth);
});

smartHome.on("stateChanged", function (aCapability) {
    console.log("stateChanged");

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
            console.log("");
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
            console.log("");
        });
    }
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
                        console.log("");
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
                        console.log("");

                    });
                }

                console.log("");
            });
        });
    }
});

console.log("Auth start uri (if auth missing)", smartHome.getAuthorizationUri());
smartHome.init();

```

## Contributing

Any contributions are welcome. However, before filing a pull request (PR) an issue should be opened. The issue should contain:

* What improvement / fix is needed
* How the solution will look like
* If on-going: the current process
* Where the improvement is helping or how the bug can be reproduced

More information about our contribution guidelines can be found in the [CONTRIBUTING file](CONTRIBUTING.md).

## License

The library has been licensed under the MIT license. Details are given the [distributed license file](LICENSE.md).
