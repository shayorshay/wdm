'use strict';

const redis = require("redis");
const config = require("./config");
const redisClient = config.redis ? redis.createClient(config.redis) : null;
const crypto = require('crypto');
const {sqlEndpoints, redisEndpoints} = require("./endpoints");

const {Client} = require('pg');
let aux = null;
if (config.sql) {
    aux = new Client(config.sql);
    aux.connect(function (err) {
        if (err)
            throw err;

        console.log("Connected to SQL");
    });
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
