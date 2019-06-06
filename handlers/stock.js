'use strict';

const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");

const colNames = {
    stock: "stock",
    id: "id",
    price: "price"
};

app.get("/availability/:itemId", function (req, res, next) {
    /**
     * @type {string}
     */
    const {itemId} = req.params;

    /**
     * @type {Stock}
     */
    redisClient.hgetall(itemId, function (err, item) {
        if (!item)
            return next(item);

        res.json(item);
    });
});

app.post("/subtract/:itemId/:stock", function (req, res, next) {
    const {itemId, stock} = req.params;

    redisClient.hincrby(itemId, colNames.stock, -stock, function (err, newNumber) {
        if (err)
            return next(err);

        if (newNumber < 0)
            return redisClient.hincrby(itemId, colNames.stock, stock, function (err) {
                if (err)
                    return next(err);

                res.sendStatus(403);
            });

        res.sendStatus(200);
    });
});

app.post("/add/:itemId/:stock", function (req, res, next) {
    const {itemId, stock} = req.params;

    redisClient.hincrby(itemId, colNames.stock, stock, (err) => {
        if (err)
            return next(err);

        res.sendStatus(200);
    })
});

app.post("/item/create", function (req, res, next) {
    const itemId = genId("item");
    const {price} = req.body;

    const newItem = {id: itemId, stock: 0, price};

    redisClient.hmset(itemId, newItem, function (err) {
        if (err)
            return next(err);

        res.json({itemId});
    });
});

module.exports = app;

/**
 * @class Stock
 * @property {string} itemId
 * @property {int} stock
 * @property {int} price
 */
