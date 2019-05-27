const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");

const colNames = {
    number: "number",
    id: "id",
    price: "price"
};

app.get("/availability/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    /**
     * @type {Stock}
     */
    redisClient.hgetall(id, function (err, item) {
        if (!item)
            return next(item);

        res.json(item);
    });
});

app.post("/subtract/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;

    redisClient.hincrby(itemId, colNames.number, -number, function (err, newNumber) {
        if (err)
            return next(err);

        if (newNumber < 0)
            return redisClient.hincrby(itemId, colNames.number, number, function (err) {
                if (err)
                    return next(err);

                res.sendStatus(403);
            });

        res.sendStatus(200);
    });
});

app.post("/add/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;

    redisClient.hincrby(itemId, colNames.number, number, (err, count) => {
        if (err)
            return next(err);

        res.json({"count": count});
    })
});

app.post("/item/create", function (req, res, next) {
    const id = genId("item");
    const price = Math.floor(Math.random() * 10) + 1;

    const newItem = {id, number: 0, price: price};

    redisClient.hmset(id, newItem, function (err) {
        if (err)
            return next(err);

        res.json({id});
    });
});

module.exports = app;

/**
 * @class Stock
 * @property {string} id
 * @property {int} number
 * @property {int} price
 */
