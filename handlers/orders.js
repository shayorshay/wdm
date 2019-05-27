const express = require('express');
const app = express();
const {redisClient, genId, endpoints} = require("../data");

app.post("/create/:user_id", async function (req, res, next) {

    const {user_id} = req.params;

    const orderId = genId("ord");

    // create empty orderItems key
    redisClient.hset(id, "user_id", user_id, (err) => {
        if (err)
            return next(err);

        res.send({orderId});
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

    redisClient.hgetall(id, async function (err, orderItems) {
        if (err)
            return next(err);

        const {user_id} = orderItems;

        orderItems.user_id = undefined;

        let status = await endpoints.payment.getStatus(id);

        let result = {
            user_id,
            orderItems,
            status
        };

        res.send(result);
    });
});


app.post("/additem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    // add item to orderItems (hincrby will create a hashkey even if it is not created yet.
    redisClient.hincrby(orderId, itemId, 1, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    })
});


app.post("/removeitem/:orderId/:itemId", function (req, res, next) {

    const {orderId, itemId} = req.params;


    // subtract item to orderItems (hincrby will create a hashkey even if it is not created yet.
    redisClient.hincrby(orderId, itemId, -1, function (err, result) {
        if (err)
            return next(err);

        if (result < 0) {
            // add item to orderItems (hincrby will create a hashkey even if it is not created yet.
            redisClient.hincrby(orderId, itemId, 1, function (err) {
                if (err)
                    return next(err);

                res.sendStatus(403);
            });

            return;
        }

        res.sendStatus(200);
    });
});


// app.post("/checkout/:id", function (req,res,next){

//     // calling payment service


//     // subtract the stocks


//     // return the status
// }
//
// );

module.exports = app;

/**
 * @class Order
 * @property {string} id
 * @property {array} orderItems
 * @property {string} userId
 */

/**
 * @class OrderItem
 * @property {string} itemId
 * @property {int} number
 */
