'use strict';

const redis = require("redis");
const config = require("./config");
const redisClient = config.redis ? redis.createClient(config.redis) : null;
const crypto = require('crypto');
const {sqlEndpoints, redisEndpoints} = require("./endpoints");

Error.prepareStackTrace = function (error) {
    let stack = error.stack;
    if (error.cause) {
        let c = error.cause;
        do {
            stack += "\nCaused by: " + c.stack;
            c = c.cause;
        } while (c);

        error.stack = stack;
    }

    return stack;
};

class ErrorWithCause extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
}

class WebServiceError extends ErrorWithCause {
    constructor(message, statusCode, cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }
}

global.ErrorWithCause = ErrorWithCause;
global.WebServiceError = WebServiceError;

const {Client} = require('pg');
let aux = null;
if (config.sql) {
    aux = new Client(config.sql);
    setTimeout(() => {
        aux.connect(function (err) {
            if (err)
                throw err;

            console.log("Connected to SQL");
        });
    }, 1000);

}

const sqlClient = aux;


function genId(partition) {
    return partition + ":" + crypto.randomBytes(20).toString('hex');
}

function getItemId(orderId, userId) {
    return userId + ":" + orderId;
}

function getAllIds(ids, callback) {
    const multi = redisClient.multi();

    for (let id of ids) {
        multi.hgetall(id)
    }


    multi.exec(callback);
}

/**
 * @type {RedisClient}
 */

module.exports = {
    redisClient,
    sqlClient,
    config,
    getAllIds,
    getItemId,
    genId,
    sqlEndpoints,
    redisEndpoints
};
