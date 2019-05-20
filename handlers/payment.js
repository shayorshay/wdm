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
            // endpoints.subtract(userId, result.)

            // Still in progress
        },
        error => {
            res.sendStatus(500);
        });
    // subtract the amount from user credit.

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
