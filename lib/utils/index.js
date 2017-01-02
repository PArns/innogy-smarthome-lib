const Promise = require("bluebird");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs');
const parseXMLString = require('xml2js').parseString;
const md5 = require('md5');

const descriptorPath = path.resolve(__dirname + "/../../data/descriptor/");


var getCachedFile = function (file) {
    if (fs.existsSync(file))
        return jsonfile.readFileSync(file);

    return null;
};

var getDescriptorFile = function (uri, requestor) {
    var file = descriptorPath + "/" + md5(uri) + ".json";

    return new Promise(function (resolve, reject) {
        var descContent = getCachedFile(file);

        if (descContent)
            resolve(descContent);
        else {
            requestor.call(uri, "GET", null, false).then(function (desc) {
                parseXMLString(desc, function (error, content) {
                    if (!error && content) {
                        jsonfile.writeFile(file, content);
                        resolve(content);
                    } else {
                        reject(uri, error);
                    }
                });
            }, reject);
        }
    });
};

module.exports = {
    getCachedFile: getCachedFile,
    getDescriptorFile: getDescriptorFile
};