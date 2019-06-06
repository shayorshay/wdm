'use strict';

const express = require('express');
const app = express();
const {redisClient, genId, endpoints} = require("../data");

const cols = {
    payment: "pmt:",
    status: "status"
};
app.post("/create/:user_id", async function (req, res, next) {

    const {user_id} = req.params;

    const orderId = genId("ord");

    // create empty orderItems key
    redisClient.hset(orderId, "user_id", user_id, (err) => {
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

app.get("/find/:id", function (req, res, next) {
    const {id} = req.params;

    redisClient.hgetall(id, async function (err, orderItems) {
        if (err)
            return next(err);

        const {user_id} = orderItems;

        orderItems.user_id = undefined;

        let status = await endpoints.payment.getStatus(id);

        let result = {
            user_id,
            orderItems,
            status
        };

        res.send(result);
    });
});


app.post("/additem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    // add item to orderItems (hincrby will create a hashkey even if it is not created yet.
    redisClient.hincrby(orderId, itemId, 1, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    })
});


app.post("/removeitem/:orderId/:itemId", function (req, res, next) {

    const {orderId, itemId} = req.params;


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
});


app.post("/checkout/:orderId", async function (req, res, next) {
    // calling payment service
    const {orderId} = req.params;
    let order_status;

    // check status
    try {
        order_status = await endpoints.payment.getStatus(orderId);
    } catch (e) {
        return next(e);
    }

    if (order_status === "FINISHED" || order_status === "CANCELED")
        return res.sendStatus(403);

    if (order_status === "PAYED") {
        try {
            await subtract();
        } catch (e) {
            next(e);
        }
        return
    }

    redisClient.hget(orderId, "user_id", async function (err, userId) {
        //calling payment function
        try {
            await endpoints.payment.pay(userId, orderId);
        } catch (e) {
            return next(e);
        }

        try {
            await subtract();
        } catch (e) {
            try {
                await endpoints.payment.cancelPayment(userId, orderId);
            } catch (e) {
                return next(e);
            }

            res.sendStatus(403);
        }
    });


    async function subtract() {
        await endpoints.stock.subtractOrder(orderId);

        // set payment status
        redisClient.hset(cols.payment + orderId, cols.status, "FINISHED", (err, res) => {
            // reached no return point, too bad
            if (err)
                return next(err);

            res.sendStatus(200);
        });
    }
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
