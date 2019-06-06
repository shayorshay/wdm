'use strict';

const express = require('express');
const app = express();
const {sqlClient} = require('../data');


app.post('/create/', async function (req, res, next) {
    /**
     * @type {User}
     */
    const body = req.body;

    // language=PostgreSQL
    sqlClient.query('INSERT into wdm.client(name) VALUES ($1) RETURNING "userId"', [body.name],
        function (err, result) {
            if (err)
                return next(err);

            res.send({userId: result.rows[0].userId});
        });
});


app.delete('/remove/:userId', function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId} = req.params;

    sqlClient.query('DELETE FROM wdm.client WHERE "userId" = $1', [userId], function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});


app.get('/find/:userId', function (req, res, next) {
    /**
     * @type {string[]}
     */
    let {userId} = req.params;

    sqlClient.query('SELECT * FROM wdm.client WHERE "userId" = $1;', [userId], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);

        res.send(result.rows[0]);
    });
});

app.get('/credit/:userId', function (req, res, next) {
    /**
     * @type {string}
     */
    const {userId} = req.params;

    sqlClient.query('SELECT credit FROM wdm.client WHERE "userId" = $1', [userId], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);


        res.send({credit: result.rows[0].credit || '0'});
    });
});

app.post('/credit/subtract/:user_id/:amount', function (req, res, next) {
    /**
     * @type {string}
     */
    const {user_id, amount} = req.params;


    // language=PostgreSQL
    sqlClient.query('UPDATE wdm.client SET credit = credit - $2 WHERE "userId" = $1 AND credit >= $2;', [user_id, amount], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1) {
            // something is wrong
            // language=PostgreSQL
            sqlClient.query('SELECT 1 FROM wdm.client WHERE "userId" = $1;', [user_id], function (err, result) {

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

app.post('/credit/add/:user_id/:amount', function (req, res, next) {
    /**
     * @type {string}
     */
    const {user_id, amount} = req.params;

    // language=PostgreSQL
    sqlClient.query('UPDATE wdm.client SET credit = credit + $2 WHERE "userId" = $1;', [user_id, amount], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1)
        // no credit
            return res.sendStatus(404);

        res.sendStatus(200);
    });
});

module.exports = app;
