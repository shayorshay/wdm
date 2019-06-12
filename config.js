'use strict';

const config = require("./config.json");

importEnviroment(config);

console.error(require('util').inspect(config, {depth: null, colors: true}));

function importEnviroment(obj, lastPath='') {
    for (let k in obj) {
        let path = (lastPath ? (lastPath + "_") : "") + k.toUpperCase();
        console.error(path);

        if ( typeof obj[k] === "object")
            importEnviroment(obj[k], path);
        else if (process.env[path])
            obj[k] = process.env[path];
    }
}

module.exports = config;
