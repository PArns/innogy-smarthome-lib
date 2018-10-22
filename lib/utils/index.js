const Promise = require("bluebird");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs');
const parseXMLString = require('xml2js').parseString;
const md5 = require('md5');

const AsyncLock = require('async-lock');
var lock = new AsyncLock();

const descriptorPath = path.resolve(__dirname + "/../../data/descriptor/");


var getCachedFile = function (file) {

    try {
        if (fs.existsSync(file))
            return jsonfile.readFileSync(file);
    } catch (e) {
        return null;
    }

    return null;
};

var getDescriptorFile = function (uri, requestor) {
    var file = descriptorPath + "/" + md5(uri) + ".json";

    return new Promise(function (resolve, reject) {
        lock.acquire(file, function(done) {
            var descContent = getCachedFile(file);

            if (descContent) {
                resolve(descContent);
                done();
            }
            else {
                requestor.call(uri, "GET", null, false).then(function (desc) {
                    parseXMLString(desc, function (error, content) {
                        if (!error && content) {
                            try {
                                jsonfile.writeFileSync(file, content);
                            } catch(e) {
                                console.log(e);
                            }
                            resolve(content);
                        } else {
                            reject(uri, error);
                        }

                        done();
                    });
                }, function (error) {
                    console.log("ERR", file, error.statusCode);

                    // Also cache 404 ...
                    if (error.statusCode === 404) {
                        jsonfile.writeFileSync(file, {});
                    }

                    done();
                });
            }
        });
    });
};

module.exports = {
    getCachedFile: getCachedFile,
    getDescriptorFile: getDescriptorFile
};