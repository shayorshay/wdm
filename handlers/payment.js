const express = require('express');
const app = express();
const {redisClient, genId} = require("../data");
const endpoints = require("../endpoints");

const cols = {
    payment: "pmt:",
    status: "status"
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
    const order = endpoints.order.get(orderId).then(order => {
            /**
             *
             * @type {number}
             */
            let cost = 0;

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
                "status": "PAYED"
            };

            // Create payment
            redisClient.hmset(paymentId, payment, (err, result) => {
                if (err)
                    res.send(err);

                // subtract amount from user account
                endpoints.subtract(userId, cost).then(
                    paymentResult => res.sendStatus(200),
                    paymentError => res.send(paymentError));

            });
        },
        error => {
            res.send(error);
        });
});

app.post("/cancelPayment/:userId/:orderId", function (req, res, next) {
    const {userId, orderId} = req.params;

    redisClient.hgetall(cols.payment, function (err, payment) {
        if (err)
            return next(err);

        // cancel the payment
        redisClient.hset(cols.payment + orderId, cols.status, "CANCELED", (err, res) => {
                if (err)
                    return next(err);

                // add funds to user
                endpoints.addFunds(userId, payment.cost).then(
                    paymentResult => {
                        // everything is cool
                        res.sendStatus(200);
                    },
                    paymentError => {
                        redisClient.hset(cols.payment + orderId, cols.status, "PAYED", (err, res) => {
                            // reached no return point, too bad
                            if (err)
                                return next(err);
                        });
                    });

                //rollback payment to initial state
                res.send(paymentError)
            }
        );

    });
});


app.get("/status/:orderId", function (req, res, next) {
    /**
     * @type {string}
     */
    const {orderId} = req.params;

    redisClient.hget(cols.payment + orderId, cols.status, (err, status) => {
        if (err)
            return next(err);

        res.send(status);
    })
});

module.exports = app;

/**
 * @class Payment
 * @property {string} id
 * @property {number} cost
 * @property {string} userId
 * @property {string} orderId
 * @property {string} status
 *
 */
