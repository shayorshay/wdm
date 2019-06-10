'use strict';

const express = require('express');
const app = express();
let redisClient, getAllIds, config, genId;

setTimeout(() => {
    redisClient = require("../data").redisClient;
    getAllIds = require("../data").getAllIds;
    config = require("../data").config;
    genId = require("../data").genId;
});

const colNames = {
    stock: "stock",
    id: "id",
    price: "price"
};
// done
function getAvailability(itemId){
    return new Promise(function(resolve,reject){
        redisClient.hgetall(itemId, function (err, item) {
            if (err)
                return reject(new ErrorWithCause("Encountered an error.", err));
    
            // if (!item)
            //     return reject;
    
            item.price = +item.price;
            item.stock = +item.stock;
    
            resolve(item);
        });
    });
}
app.get("/availability/:itemId", async function (req, res, next) {
    /**
     * @type {string}
     */
    const {itemId} = req.params;
    let result;
    /**
     * @type {Stock}
     */
    try{
        result = await getAvailability(itemId);
    } catch{
        return next(e);
    }
    if (!result)
        res.sendStatus(404);
    res.json(result);
});
// done
function subtractStocks(itemId,stock){
    return new Promise(function (resolve, reject) {
        redisClient.hincrby(itemId, colNames.stock, -stock, function (err, newNumber) {
            if (err)
                return next(new ErrorWithCause("Encountered an error.", err));
    
            if (newNumber < 0)
                return redisClient.hincrby(itemId, colNames.stock, stock, function (err) {
                    if (err)
                        return next(new ErrorWithCause("Encountered an error.", err));
    
                    return reject(new WebServiceError("Not enough stocks.", 403, err));
                   
                });
    
            resolve();
        });
    });
}
app.post("/subtract/:itemId/:stock", async function (req, res, next) {
    const {itemId, stock} = req.params;
    try {
        await subtractStocks(itemId, stock);
    } catch (e) {
        return next(e);
    }

    res.sendStatus(200);
    
});



app.post("/add/:itemId/:stock", async function (req, res, next) {
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

module.exports = {app,subtractStocks,getAvailability};

/**
 * @class Stock
 * @property {string} itemId
 * @property {int} stock
 * @property {int} price
 */
