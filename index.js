'use strict';

const express = require('express');

/**
 * @type {app}
 */
const app = express();

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

app.use("/users/", require("./handlers/users"));
app.use("/stock/", require("./handlers/stock"));
app.use("/orders/", require("./handlers/orders"));

app.listen(8000);
