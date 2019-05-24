const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");


const ordercol = {
    userid: "userid",
    orderid: "orderid",
    itemid: "itemid",
    number: "number",
    items: "items",
    orderItemsId: "orderItemsId"
};

app.post("/create/:usr_id", async function (req, res, next) {

    const {usr_id} = req.params;

    const body = req.body;
    const id = genId("order");
    body.id = id;
    body.user_id = usr_id;

    const orderItemId = genId("orderItems");

    // create empty orderItems key
    redisClient.hset(orderItemId, "", "", (err, result) => {
        if (err)
            return next(err);

        body[`${ordercol.orderItemsId}`] = orderItemId;

        // create actual order, assign orderItemsId and all fields
        redisClient.hmset(id, body, function (err) {
            if (err)
                return next(err);

            res.send({id});
        });
    });

});

app.delete("/remove/:id", function (req, res, next) {

    const {id} = req.params;

    redisClient.del(id, function (err) {    //hdel does not remove the key as intended
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});

app.get("/find/:id", function (req, res, next) {
    const {id} = req.params;

    redisClient.hgetall(id, function (err, order) {
        if (err)
            return next(err);

        // fetch and append all items for particular order
        redisClient.hgetall(order.orderItemsId, (err, orderItemList) => {
            order.orderItems = orderItemList;
            res.send(order);
        });
    });
});


app.post("/additem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    // get orderItem id
    redisClient.hget(orderId, ordercol.orderItemsId, (err, item) => {
        if (err)
            return next(err);
        
        // add item to orderItems (hincrby will create a hashkey even if it is not created yet.
        redisClient.hincrby(item, itemId, 1, function (err, result) {
            if (err)
                return next(err);

            res.json({"itemId": itemId, "count": result});
        })
    });
});


app.post("/removeitem/:orderId/:itemId", function (req, res, next) {

    const {orderId, itemId} = req.params;

    redisClient.hget(orderId, ordercol.orderItemsId, (err, item) => {
        if (err)
            return next(err);
        
        // remove item to orderItems
        redisClient.hincrby(item, itemId, -1, function (err, result) {
            if (err)
                return next(err);
            // if item num< 0 , set to 0
            if (result < 0)
              {
                  result = 0;
                  redisClient.hmset(item, itemId, 0);
              }  
            
            res.json({"itemId": itemId, "count": result});
        })
    });
});


// app.post("/checkout/:id", function (req,res,next){

//     // calling payment service


//     // subtract the stocks


//     // return the status
// }

// );

module.exports = app;

/**
 * @class Order
 * @property {string} id
 * @property {string} itemsId
 * @property {string} userId
 */

/**
 * @class OrderItem
 * @property {string} itemId
 * @property {int} number
 */