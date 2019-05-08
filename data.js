'use strict';

const redis = require("redis");
const config = require("./config");
const redisClient = redis.createClient(config.redis);
const crypto = require('crypto');


function genId(partition) {
    return partition + ":" + crypto.randomBytes(20).toString('hex');
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
    config,
    getAllIds,
    genId
};
