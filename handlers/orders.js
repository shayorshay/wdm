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

app.get("/find/:id", function (req, res, next) {
    const {id} = req.params;

    redisClient.hgetall(id, async function (err, orderItems) {
        if (err)
            return next(err);

        if (!orderItems)
            return res.sendStatus(404);

        const {userId} = orderItems;

        orderItems.userId = undefined;

        let status = await redisEndpoints.payment.getStatus(id);

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
    if(status == "FINISHED")
        res.sendStatus(403);
    else{
        redisClient.hincrby(orderId, itemId, 1, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
        })
    }
    // add item to orderItems (hincrby will create a hashkey even if it is not created yet.

});


app.delete("/removeItem/:orderId/:itemId", async function (req, res, next) {

    const {orderId, itemId} = req.params;

    let status = await redisEndpoints.payment.getStatus(orderId);
    if(status === "FINISHED")
        res.sendStatus(403);
    else{
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

    if (order_status === "FINISHED" || order_status === "CANCELED")
        return res.sendStatus(403);

    if (order_status === "PAID") {

        try {
            await redisEndpoints.stock.subtractOrder(orderId);
        } catch (e) {
            return next(e);
        }
        return res.sendStatus(200);
    }
    else{
    redisClient.hget(orderId, "userId", async function (err, userId) {
        //calling payment function


        try {
            await redisEndpoints.stock.subtractOrder(orderId);
        } catch (e) {
            try {
                await redisEndpoints.payment.cancelPayment(userId, orderId);
            } catch (e) {
                return next(e);
            }

            res.sendStatus(403);
        }
        try {

            await redisEndpoints.payment.pay(userId, orderId);
            await set_status();
            res.sendStatus(200);
        } catch (e) {
            return next(e);
        }
    });
}

    async function set_status() {


        // set payment status
        redisClient.hset(cols.payment + orderId, cols.status, "FINISHED", (err, res) => {
            // reached no return point, too bad
            if (err)
                return next(err);

            //res.sendStatus(200);
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
