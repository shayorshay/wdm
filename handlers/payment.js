const express = require('express');
const app = express();
const {redisClient, genId} = require("../data");
const endpoints = require("../endpoints");

const cols = {
    payment: "payment:"
};

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
            /**
             *
             * @type {number}
             */
            let cost = 0;
            /**
             * @type {Order}
             */
            const order = JSON.parse(result);

            // for now lets assume each item costs 1 euro
            Object.values(order.orderItems).forEach(r => {
                cost += parseInt(r);
            });

            /**
             * @type {string}
             */
            const paymentId = cols.payment + orderId;

            /**
             * @type {Payment}
             */
            const payment = {
                "id": paymentId,
                "cost": cost,
                "userId": userId,
                "orderId": orderId,
            };

            redisClient.hmset(paymentId, payment, (err, result) => {
                if (err)
                    res.send(err);

                endpoints.subtract(userId, cost).then(
                    paymentResult => res.sendStatus(200),
                    paymentError => res.send(paymentError));

            });
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
 * @property {number} cost
 * @property {string} userId
 * @property {string} orderId
 *
 */
