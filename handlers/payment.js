'use strict';

const express = require('express');
const app = express();
const {redisClient, genId, redisEndpoints} = require("../data");

const cols = {
    payment: "pmt:",
    status: "status"
};

app.get("/", function (req, res) {

    res.send("Testing service availability");
});

app.post("/pay/:userId/:orderId", async function (req, res, next) {
    let responses;
    let order;
    /**
     * @type {string}
     */
    const {userId, orderId} = req.params;

    // Get order from order service
    try {
        order = await redisEndpoints.orders.get(orderId);
    } catch (e) {
        return next(new ErrorWithCause("Encountered an error.", e));
    }

    let requests = [];
    for (let itemId in order.orderItems) {
        requests.push(redisEndpoints.stock.getAvailability(itemId));
    }

    try {
        responses = await Promise.all(requests);
    } catch (e) {
        return next(new ErrorWithCause("Encountered an error.", e));
    }

    let sum = 0;
    for (let response of responses) {
        sum += response.price * order.orderItems[response.itemId];
    }

    try {
        await redisEndpoints.users.subtract(userId, sum);
    } catch (e) {
        return next(new ErrorWithCause("Encountered an error.", e));
    }

    redisClient.set(cols.payment + orderId, sum, (err) => {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.sendStatus(200);
    });
});

app.post("/cancelPayment/:userId/:orderId", function (req, res, next) {
    const {userId, orderId} = req.params;
    // cancel the payment
    redisClient.del(cols.payment + orderId, async (err, ammount) => {
            if (err)
                return next(new Error(err.message));

            if (!ammount)
                return res.status(403);

            try {
                await redisEndpoints.users.addFunds(userId, ammount);
            } catch (e) {
                return next(new ErrorWithCause(err));
            }

            res.send();
        }
    );
});


app.get("/status/:orderId", function (req, res, next) {
    /**
     * @type {string}
     */
    const {orderId} = req.params;

    redisClient.get(cols.payment + orderId, (err, cost) => {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        if (cost)
            res.send("PAYED");

        else res.send("NOT_PAYED");
    });
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
