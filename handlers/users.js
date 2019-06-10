'use strict';

const express = require('express');
const app = express();
const {redisClient, getAllIds, genId} = require("../data");
const script = require('fs').readFileSync('./lua/subtract-script.lua');

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
            result.credit = + result.credit;

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

app.post("/credit/subtract/:userId/:amount", function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId, amount} = req.params;

    redisClient.eval(script, 1, userId, "credit", amount, function(err, result) {
        if (err)
            return next(err);

        if (!result)
            return next(new WebServiceError("Not enough credit.", 403));

        res.sendStatus(200);
    });
});

app.post("/credit/add/:userId/:amount", function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId, amount} = req.params;

    redisClient.hincrby(userId, "credit", amount, function (err) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.sendStatus(200);
    });
});

module.exports = app;
