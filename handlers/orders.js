const express = require('express');
const app = express();
const {redisClient, genId,endpoints} = require("../data");
const endpoint = require("../endpoints");

const cols = {
    payment: "pmt:",
    status: "status"
};
app.post("/create/:user_id", async function (req, res, next) {

    const {user_id} = req.params;

    const orderId = genId("ord");

    // create empty orderItems key
    redisClient.hset(orderId, "user_id", user_id, (err) => {
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


app.post("/checkout/:orderId", function (req,res,next){

     // calling payment service
     const {orderId} = req.params;
     // check status
     endpoint.payment.getStatus(orderId).then(order_status=>
    {
        if ((order_status == "FINISHED")||(order_status == "CANCELED"))
            res.sendStatus(403);
        else if (order_status == "PAYED")
        {
            endpoint.order.get(orderId).then(order => {
                            
                Object.entries(order.orderItems).forEach(item =>{

                    endpoint.stock.subtract(item[0],parseInt(item[1]));
                    
                });
                
            });
            res.sendStatus(200);
        }
        else{
            redisClient.hget(orderId,"user_id", function(err, userId){
                //calling payment function
                endpoint.payment.pay(userId,orderId).then(
                    checkoutResult=>{
                    // subtract the stocks
                        endpoint.order.get(orderId).then(order => {
                            
                            Object.entries(order.orderItems).forEach(item =>{
        
                                endpoint.stock.subtract(item[0],parseInt(item[1]));
                                
                            });
                            
                        });
                    // set payment status
                    redisClient.hset(cols.payment + orderId, cols.status, "FINISHED", (err, res) => {
                        // reached no return point, too bad
                        if (err)
                            return next(err);
                    });
                    res.sendStatus(200);
            
                        
                    },
                    checkoutError=>{
                        if (err)
                            return next(err);
                        
                    });
                   
             });
        
        }
    });
     
    
});

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
