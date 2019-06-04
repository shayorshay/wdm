const express = require('express');
const app = express();
const {sqlClient} = require("../data");


app.post("/create/", async function (req, res, next) {
    /**
     * @type {User}
     */
    const body = req.body;

    // language=PostgreSQL
    sqlClient.query("INSERT into wdm.client(name) VALUES ($1) RETURNING id", [body.name],
        function (err, result) {
            if (err)
                return next(err);

            res.send({id: result.rows[0].id});
        });
});


app.delete("/remove/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    sqlClient.query("DELETE FROM wdm.client WHERE id = $1", [id], function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});


app.get("/find/", function (req, res, next) {
    /**
     * @type {string[]}
     */
    let ids = req.query.ids;

    if (!Array.isArray(ids))
        ids = [ids];

    sqlClient.query("SELECT * FROM wdm.client WHERE id = ANY($1::int[]);", [ids], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);

        res.send(result.rows[0]);
    });
});

app.get("/credit/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    sqlClient.query("SELECT credit FROM wdm.client WHERE id = $1", [id], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);


        res.send({credit: result.rows[0].credit || "0"});
    });
});

app.post("/credit/subtract/:user_id/:amount", function (req, res, next) {
    /**
     * @type {string}
     */
    const {user_id, amount} = req.params;


    // language=PostgreSQL
    sqlClient.query("UPDATE wdm.client SET credit = credit - $2 WHERE id = $1 AND credit >= $2;", [user_id, amount], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1) {
            // something is wrong
            // language=PostgreSQL
            sqlClient.query("SELECT 1 FROM wdm.client WHERE id = $1;", [user_id], function (err, result) {

                if (result.rowCount !== 1)
                // user not found
                    return res.sendStatus(404);

                // no credit or no user
                return res.sendStatus(403);
            });
        } else {
            res.sendStatus(200);
        }
    });
});

app.post("/credit/add/:user_id/:amount", function (req, res, next) {
    /**
     * @type {string}
     */
    const {user_id, amount} = req.params;

    // language=PostgreSQL
    sqlClient.query("UPDATE wdm.client SET credit = credit + $2 WHERE id = $1;", [user_id, amount], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1)
        // no credit
            return res.sendStatus(404);

        res.sendStatus(200);
    });
});

module.exports = app;
