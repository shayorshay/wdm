'use strict';

const redis = require("redis");
const config = require("./config");
const redisClient = redis.createClient(config.redis);


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
    getAllIds
};
