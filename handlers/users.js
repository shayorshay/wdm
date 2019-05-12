
const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");


app.post("/create/", async function (req, res, next) {
    /**
     *
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
    /**
     * @type {User}
     */

    redisClient.hdel(id, function (err) {
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
    /**
     * @type {User}
     */

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
    /**
     * @type {User}
     */

    redisClient.hget(id, "credit", function (err, response) {
        if (err)
            return next(err);

        res.send({credit: 0});
    });
});

module.exports = app;
