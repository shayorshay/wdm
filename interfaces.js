'use strict';

const express = require('express');
const crypto = require('crypto');

const {redisClient, getAllIds, config} = require("./data");
/**
 * @type {app}
 */
const app = express();

function genId(partition) {
    return partition + ":" + crypto.randomBytes(20).toString('hex');
}

app.use(express.json());


// const EVENTS_QUEUE = 'events';
//
//
// const amqp = require('amqplib/callback_api');
//
// amqp.connect('amqp://localhost', function(err, connection) {
//     if (err) {
//         throw err;
//     }
//     connection.createChannel(function(err, channel) {
//         if (err) {
//             throw err;
//         }
//
//         channel.assertQueue(EVENTS_QUEUE, {
//             durable: true
//         });
//
//         channel.consume(EVENTS_QUEUE, function(msg) {
//             console.log(" [x] Received %s", msg.content.toString());
//         }, {
//             noAck: true
//         });
//
//         // channel.sendToQueue(queue, Buffer.from(msg));
//     });
// });


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
    const id = genId("usr");
    body.id = id;

    redisClient.hmset(id, body, function (err) {
        if (err)
            return next(err);

        res.send({id});
    });
});


app.delete("/users/remove/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;
    /**
     * @type {User}
     */

    redisClient.hdel(id, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});


app.get("/users/find/", function (req, res, next) {
    /**
     * @type {string}
     */
    const ids = req.query.ids;
    /**
     * @type {User}
     */

    getAllIds(ids, function (err, objects) {
        if (err)
            return next(err);

        res.send(objects.filter(e => e !== null));
    });
});

app.get("/users/credit/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;
    /**
     * @type {User}
     */

    redisClient.hget(id, "credit", function (err, response) {
        if (err)
            return next(err);

        res.send({credit: 0});
    });
});

app.listen(8000);
