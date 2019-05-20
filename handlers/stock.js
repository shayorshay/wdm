const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");

app.get("/", function (req, res) {

    res.send("AKSJDKJASBDJK");
});

app.get("/availability/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    /**
     * @type {Stock}
     */
    redisClient.get(id, function (err, item) {
        if (!item)
            return next(item);

        res.sendStatus(200);
    });
});

app.post("/subtract/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;

    redisClient.incrby(itemId, -number, (err, count) => {
        if (err)
            return next(err);

        res.json({"count": count});
    })
});

app.post("/add/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;

    redisClient.incrby(itemId, number, (err, count) => {
        if (err)
            return next(err);

        res.json({"count": count});
    })
});

module.exports = app;

/**
 * @class Stock
 * @property {string} id
 * @property {string} number
 */
