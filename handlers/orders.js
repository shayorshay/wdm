
const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");


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

module.exports = app;
