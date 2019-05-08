'use strict';

const express = require('express');
const crypto = require('crypto');
/**
 * @type {app}
 */
const app = express();

function genId() {
    return crypto.randomBytes(20).toString('hex');
}

app.use(express.json());

const redis = require("redis");

const config = require("./config");

/**
 * @type {RedisClient}
 */
const redisClient = redis.createClient(config.redis);

/**
 * @class User
 * @property {string} id
 * @property {string} name
 * @property {number} credit
 */


app.post("/users/create/", async function (req, res, next) {
    /**
     *
     * @type {User}
     */
    const body = req.body;
    const id = genId();
    body.id = id;

    redisClient.hmset(id, body, function (err) {
        if (err)
            return next(err);

        res.send({id});
    });
});


app.delete("/users/remove/:id", async function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;
    /**
     * @type {User}
     */


    res.send({id});
});

app.listen(8000);
