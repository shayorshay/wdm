'use strict';

const express = require('express');
const app = express();
let redisClient, genId, redisEndpoints;
setTimeout(() => {
    redisClient = require("../data").redisClient;
    genId = require("../data").genId;
    redisEndpoints = require("../data").redisEndpoints;
});

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
            return next(new ErrorWithCause("Encountered an error.", err));

        res.send({orderId});
    });
});

app.delete("/remove/:id", function (req, res, next) {

    const {id} = req.params;

    redisClient.del(id, function (err) {    //hdel does not remove the key as intended
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.sendStatus(200);
    });
});

function getOrder(orderId){
    return new Promise( function(resolve,reject){
        redisClient.hgetall(orderId, async function (err, response) {
            if (err)
                return reject(new ErrorWithCause("Encountered an error.", err));
    
            if (!response)
                return resolve(response);
    
            const {userId} = response;
    
            let orderItems = {};
    
            response.userId = undefined;
    
            for (let k in response) {
                if (response[k])
                    orderItems[k] = +response[k];
            }
    
            let status = await redisEndpoints.payment.getStatus(orderId);
    
            let result = {
                userId,
                orderItems,
                status
            };
    
            resolve(result);
        });
    });
}
app.get("/find/:orderId", async function (req, res, next) {
    const {orderId} = req.params;
    let result;
    try{
        result = await getOrder(orderId);
    } catch(e){
        return next(e);
    }
    if(!result)
    res.sendStatus(404);
    else
        res.send(result);
});


app.post("/addItem/:orderId/:itemId", async function (req, res, next) {
    const {orderId, itemId} = req.params;

    let status = await redisEndpoints.payment.getStatus(orderId);
    if (status === "PAYED")
        res.sendStatus(403);
    else {
        redisClient.hincrby(orderId, itemId, 1, function (err) {
            if (err)
                return next(new ErrorWithCause("Encountered an error.", err));

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
                return next(new ErrorWithCause("Encountered an error.", err));

            if (result < 0) {
                // add item to orderItems (hincrby will create a hashkey even if it is not created yet.
                redisClient.hincrby(orderId, itemId, 1, function (err) {
                    if (err)
                        return next(new ErrorWithCause("Encountered an error.", err));

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
        return next(new ErrorWithCause("Failed to get status", e));
    }

    if (order_status === "PAYED")
        return next(new WebServiceError("Already payed", 403));


    redisClient.hgetall(orderId, async function (err, orderItems) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        if (!orderItems)
            return next(new WebServiceError("Could not find order id", 404));

        let {userId} = orderItems;
        orderItems.userId = undefined;

        try {
            await redisEndpoints.payment.pay(userId, orderId);
        } catch (e) {
            return next(new WebServiceError("Failed payment", 403, e));
        }

        try {
            await redisEndpoints.stock.subtractOrder(orderItems);
        } catch (e) {
            try {
                await redisEndpoints.payment.cancelPayment(userId, orderId);
            } catch (e) {
                return next(new ErrorWithCause("Failed cancel payment", e));
            }

            return next(new WebServiceError("Failed subtracting stock", 403, e));
        }

        res.sendStatus(200);

    });
});

module.exports = {app,getOrder};

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
