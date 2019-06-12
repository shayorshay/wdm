'use strict';

const express = require('express');
const app = express();
let redisClient, getAllIds, genId;

setTimeout(() => {
    redisClient = require("../data").redisClient;
    getAllIds = require("../data").getAllIds;
    genId = require("../data").genId;
});


app.post("/create/", async function (req, res, next) {
    /**
     * @type {User}
     */
    const body = req.body;
    const userId = genId("usr");
    body.userId = userId;

    redisClient.hmset(userId, body, function (err) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.send({userId: userId});
    });
});


app.delete("/remove/:userId", function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId} = req.params;

    redisClient.del(userId, function (err) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.sendStatus(200);
    });
});


app.get("/find/:userId", function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId} = req.params;

    redisClient.hgetall(userId, function (err, result) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        if (result.credit)
            result.credit = +result.credit;

        res.send(result);
    });
});

app.get("/credit/:userId", function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId} = req.params;

    redisClient.hget(userId, "credit", function (err, credit) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.send({credit});
    });
});

function subtract(userId, amount) {
    return new Promise(function (resolve, reject) {
        redisClient.hincrby(userId, "credit", -amount, function (err, newCredit) {
            if (err)
                return reject(new ErrorWithCause("Encountered an error.", err));

            if (newCredit < 0)
                return redisClient.hincrby(userId, "credit", amount, function (err) {
                    if (err)
                        return next(new ErrorWithCause("Encountered an error.", err));

                    // gets translated by the error handler in 403
                    return reject(new WebServiceError("Not enough funds.", 403, err));

                });

            resolve();
        });
    });

}

app.post("/credit/subtract/:userId/:amount", async function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId, amount} = req.params;

    try {
        await subtract(userId, amount);
    } catch (e) {
        return next(e);
    }

    res.sendStatus(200);
});

function addFunds(userId, amount) {
    return new Promise(function (resolve, reject) {
        redisClient.hincrby(userId, "credit", amount, function (err, newCredit) {
            if (err)
                return reject(new ErrorWithCause("Encountered an error.", err));
            
            resolve();
        });
    });

}

app.post("/credit/add/:userId/:amount", async function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId, amount} = req.params;
    //let result;
    try {
        await addFunds(userId, amount);
    } catch (e) {
        return next(e);
    }
    res.sendStatus(200);
});

module.exports = {app, subtract, addFunds};
