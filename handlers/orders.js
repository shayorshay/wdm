'use strict';

const express = require('express');
const app = express();
const {redisClient, genId, redisEndpoints} = require("../data");

const cols = {
    payment: "pmt:",
    status: "status"
};

app.post("/create/:userId", async function (req, res, next) {
    const {userId} = req.params;

    const orderId = genId("ord");

    // create empty orderItems key
    redisClient.hset(orderId, "userId", userId, (err) => {
        if (err)
            return next(err);

        res.send({orderId});
    });
});

app.delete("/remove/:id", function (req, res, next) {

    const {id} = req.params;

    redisClient.del(id, function (err) {    //hdel does not remove the key as intended
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});

app.get("/find/:orderId", function (req, res, next) {
    const {orderId} = req.params;

    redisClient.hgetall(orderId, async function (err, orderItems) {
        if (err)
            return next(err);

        if (!orderItems)
            return res.sendStatus(404);

        const {userId} = orderItems;

        orderItems.userId = undefined;

        let status = await redisEndpoints.payment.getStatus(orderId);

        let result = {
            userId,
            orderItems,
            status
        };

        res.send(result);
    });
});


app.post("/addItem/:orderId/:itemId", async function (req, res, next) {
    const {orderId, itemId} = req.params;

    let status = await redisEndpoints.payment.getStatus(orderId);
    if (status === "PAYED")
        res.sendStatus(403);
    else {
        redisClient.hincrby(orderId, itemId, 1, function (err) {
            if (err)
                return next(err);

            res.sendStatus(200);
        })
    }
});


app.delete("/removeItem/:orderId/:itemId", async function (req, res, next) {

    const {orderId, itemId} = req.params;

    let status = await redisEndpoints.payment.getStatus(orderId);
    if (status === "PAYED")
        res.sendStatus(403);

    else {
        // subtract item to orderItems (hincrby will create a hashkey even if it is not created yet.
        redisClient.hincrby(orderId, itemId, -1, function (err, result) {
            if (err)
                return next(err);

            if (result < 0) {
                // add item to orderItems (hincrby will create a hashkey even if it is not created yet.
                redisClient.hincrby(orderId, itemId, 1, function (err) {
                    if (err)
                        return next(err);

                    res.sendStatus(403);
                });

                return;
            }

            res.sendStatus(200);
        });
    }
});


app.post("/checkout/:orderId", async function (req, res, next) {
    // calling payment service
    const {orderId} = req.params;
    let order_status;

    // check status
    try {
        order_status = await redisEndpoints.payment.getStatus(orderId);
    } catch (e) {
        return next(e);
    }

    if (order_status === "PAYED")
        return res.sendStatus(403);


    redisClient.hgetall(orderId, async function (err, orderItems) {
        if (err)
            return next(err);

        let {userId} = orderItems;
        orderItems.userId = undefined;

        try {
            await redisEndpoints.payment.pay(userId, orderId);
        } catch (e) {
            return next(e);
        }

        try {
            await redisEndpoints.stock.subtractOrder(orderItems);
        } catch (e) {
            try {
                await redisEndpoints.payment.cancelPayment(userId, orderId);
            } catch (e) {
                return next(new Error(e.message));
            }

            res.sendStatus(403);
        }

        res.sendStatus(200);

    });
});

module.exports = app;

/**
 * @class Order
 * @property {string} id
 * @property {array} orderItems
 * @property {string} userId
 */

/**
 * @class OrderItem
 * @property {string} itemId
 * @property {int} number
 */
