
const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");


const ordercol = {
    userid: "userid",
    orderid: "orderid",
    itemid: "itemid",
    number: "number"
};

app.post("/create/:usr_id", async function (req, res, next) {

    const {usr_id} = req.params;

    const body = req.body;
    const id = genId("order");
    body.id = id;
    body.user_id = usr_id;

    redisClient.hmset(id, body, function (err) {
        if (err)
            return next(err);

        res.send({id});
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

    redisClient.hgetall(id, function (err, response) {
        if (err)
            return next(err);

        res.send(response);
    });
});


app.post("/additem/:id/:item_id", function (req,res,next){

    const {id, item_id} = req.params;
    number = 1;
   
    redisClient.hvals(item_id, (err, value)=>{
        // if the item exists
        if (value[number] == null)
            return next(err);
         // if the item stock enough
        if (value[number] <1)
            return next(err);
        
            // console.log(value[number]);
        redisClient.hincrby(id, item_id , number, (err, count) =>{
            if (err)
                return next(err);
            if (count > value[number])
                return next(err);
            
            res.json({"id": id, "itemid":item_id,"count": count});

         });
        
        });
 
});

app.post("/removeitem/:id/:item_id", function (req,res,next){

    const {id, item_id} = req.params;
    number = 1;
    
    redisClient.hvals(item_id, (err, value)=>{
    // if the item exists
        if (value[number] == null)
            return next(err);
        redisClient.hincrby(id, item_id , -number, (err, count) =>{
            if (err)
                return next(err);
            if (count <0)
                return next(err);
            
            res.json({"id": id, "itemid":item_id,"count": count});

         });
        
        })
 
});


// app.post("/checkout/:id", function (req,res,next){
   
//     // calling payment service


//     // subtract the stocks


//     // return the status
// }

// );

module.exports = app;
