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
    redisClient.hget(id, "number", function (err, item) {
        if (!item)
            return next(item);

        res.json({"count": item});
    });
});

app.post("/subtract/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;

    redisClient.hget(itemId, "number", function (err, item) {
        if (!item || item - number < 0)
            return next(item);

        redisClient.hincrby(itemId, colNames.number, -number, (err, count) => {
            if (err)
                return next(err);

            res.json({"count": count});
        })
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
    const newItem = {id, number: 0};

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
 * @property {string} number
 */
