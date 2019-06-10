'use strict';

const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");
const fs = require('fs');

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
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        if (!item)
            return res.sendStatus(404);

        item.price = +item.price;
        item.stock = +item.stock;

        res.json(item);
    });
});

app.post("/subtract/:itemId/:stock", function (req, res, next) {    //should be atomic
    const {itemId, stock} = req.params;

    //lua
    redisClient.eval(`local itemStock = redis.call("HGET", KEYS[1], 'stock')
local toSubtract = ARGV[1];

if (itemStock > toSubtract) then
    return redis.call("HINCRBY", KEYS[1], 'stock', -toSubtract)
else
    return nil
end
`, 1, itemId, stock, function(err, result) {
        if (err)
            return next(err);

        if (!result)
            return next(new WebServiceError("Not enough funds.", 403));

        res.sendStatus(200);
    });
});

app.post("/add/:itemId/:stock", function (req, res, next) {
    const {itemId, stock} = req.params;

    redisClient.hincrby(itemId, colNames.stock, stock, (err) => {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        res.sendStatus(200);
    })
});

app.post("/item/create", function (req, res, next) {
    const itemId = genId("item");
    let {price} = req.body;

    price = +price;

    const newItem = {itemId, stock: 0, price};

    redisClient.hmset(itemId, newItem, function (err) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

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
