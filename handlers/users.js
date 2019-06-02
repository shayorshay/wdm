const express = require('express');
const app = express();
const {redisClient, getAllIds, genId} = require("../data");


app.post("/create/", async function (req, res, next) {
    /**
     * @type {User}
     */
    const body = req.body;
    const id = genId("usr");
    body.id = id;

    redisClient.hmset(id, body, function (err) {
        if (err)
            return next(err);

        res.send({id});
    });
});


app.delete("/remove/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    redisClient.del(id, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});


app.get("/find/", function (req, res, next) {
    /**
     * @type {string}
     */
    const ids = req.query.ids;

    getAllIds(ids, function (err, objects) {
        if (err)
            return next(err);

        res.send(objects.filter(e => e !== null));
    });
});

app.get("/credit/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    redisClient.hget(id, "credit", function (err, credit) {
        if (err)
            return next(err);

        res.send({credit});
    });
});

app.post("/credit/subtract/:user_id/:amount", function (req, res, next) {
    /**
     * @type {string}
     */
    const {user_id, amount} = req.params;

    redisClient.hincrby(user_id, "credit", -amount, function (err, newCredit) {
        if (err)
            return next(err);

        if (newCredit < 0)
            return redisClient.hincrby(user_id, "credit", amount, function (err) {
                if (err)
                    return next(err);

                res.sendStatus(403);
            });

        res.sendStatus(200);
    });
});

app.post("/credit/add/:user_id/:amount", function (req, res, next) {
    /**
     * @type {string}
     */
    const {user_id, amount} = req.params;

    redisClient.hincrby(user_id, "credit", amount, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});

module.exports = app;
