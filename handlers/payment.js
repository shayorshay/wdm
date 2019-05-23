const express = require('express');
const app = express();
const {redisClient, genId} = require("../data");
const endpoints = require("../endpoints");

app.get("/", function (req, res) {

    res.send("Testing service availability");
});

app.post("/pay/:userId/:orderId", async function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId, orderId} = req.params;

    // Get order from order service
    const order = endpoints.order.get(orderId).then(result => {
            const test = "asasas";

            let cost = 0;

            // for now lets assume each item costs 1 euro
            Object.values(result).forEach(r => {
                cost += r;
            });

            endpoints.subtract(userId, cost).then(
                paymentResult => res.sendStatus(200),
                paymentError => res.send(paymentError));

        },
        error => {
            res.send(error);
        });
});

// app.post("/cancelPayment/:userId/:orderId", function (req, res, next) {
//     const {userId, orderId} = req.params;
//
//     redisClient.incrby(itemId, -number, (err, count) => {
//         if (err)
//             return next(err);
//
//         res.json({"count": count});
//     })
// });
//
// app.post("/stock.js/:itemId/:number", function (req, res, next) {
//     const {itemId, number} = req.params;
//
//     redisClient.incrby(itemId, number, (err, count) => {
//         if (err)
//             return next(err);
//
//         res.json({"count": count});
//     })
// });

module.exports = app;

/**
 * @class Payment
 * @property {string} id
 * @property {int} number
 * @property {string} userId
 */
