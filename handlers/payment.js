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

app.get("/", function (req, res) {

    res.send("Testing service availability");
});

function pay(userId,orderId){
    return new Promise(async function (resolve, reject) {
        let responses;
    let order;
    try {
        order = await redisEndpoints.orders.get(orderId);
    } catch (e) {
        return reject(new ErrorWithCause("Encountered an error.", e));
    }

    let requests = [];
    for (let itemId in order.orderItems) {
        requests.push(redisEndpoints.stock.getAvailability(itemId));
    }

    try {
        responses = await Promise.all(requests);
    } catch (e) {
        return reject(new ErrorWithCause("Encountered an error.", e));
    }

    let sum = 0;
    for (let response of responses) {
        sum += response.price * order.orderItems[response.itemId];
    }

    try {
        await redisEndpoints.users.subtract(userId, sum);
    } catch (e) {
        return reject(new ErrorWithCause("Encountered an error.", e));
    }

    redisClient.set(cols.payment + orderId, sum, (err) => {
        if (err)
            return reject(new ErrorWithCause("Encountered an error.", err));

        resolve();
    });
    });
}
app.post("/pay/:userId/:orderId", async function (req, res, next) {
    
    /**
     * @type {string}
     */
    const {userId, orderId} = req.params;

    // Get order from order service
    try{
        await pay(userId,orderId);
    } catch(e){
        return next(e);
    }
    res.sendStatus(200);
    
});
// done
function cancelPayment(userId,orderId){
    return new Promise(function (resolve, reject) {
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

            resolve();
        }
    );
    });
}
app.post("/cancelPayment/:userId/:orderId", async function (req, res, next) {
    const {userId, orderId} = req.params;
    // cancel the payment
    try{
        await cancelPayment(userId,orderId);
    } catch(e){
        return next(e);
    }
    res.send();
});
// done
function getStatus(orderId){
    return new Promise(function (resolve, reject) {
        redisClient.get(cols.payment + orderId, (err, cost) => {
            if (err)
                return next(new ErrorWithCause("Encountered an error.", err));
    
             if (cost)
                 resolve("PAYED")
    
             else resolve("NOT_PAYED");
        });
    });
}
app.get("/status/:orderId", async function (req, res, next) {
    /**
     * @type {string}
     */
    const {orderId} = req.params;
    let result;
    try {
        result = await getStatus(orderId);
    } catch (e) {
        return next(e);
    }
    return res.send(result);
});

module.exports = {app,getStatus,cancelPayment,pay};

/**
 * @class Payment
 * @property {string} id
 * @property {number} cost
 * @property {string} userId
 * @property {string} orderId
 * @property {string} status
 *
 */
