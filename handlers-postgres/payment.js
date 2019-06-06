'use strict';

const express = require('express');
const app = express();
const {sqlClient, sqlEndpoints} = require('../data');


app.post('/pay/:userId/:orderId', async function (req, res, next) {
    const {userId, orderId} = req.params;

    sqlClient.query('SELECT SUM(cost) FROM wdm.order_item WHERE "orderId" = $1', [orderId], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1) {
            //something went wrong
            return res.sendStatus(404);

        } else {
            let cost = result.rows[0].sum;

            sqlClient.query('SELECT * FROM wdm.payment WHERE "orderId" = $1', [orderId], function (err, result) {
                if (err)
                    return next(err);

                if (result.rowCount !== 1) { //no payment for order exists -- create new
                    sqlClient.query('INSERT INTO wdm.payment ("paymentId", cost, "orderId", "userId", status) VALUES ($1, $2, $3, $4, \'PAID\')', [orderId, cost, orderId, userId], function (err, result) {
                        if (err)
                            return next(err);

                        sqlEndpoints.subtract(userId, cost).then(
                            paymentResult => res.sendStatus(200),
                            paymentError => res.send(paymentError));

                    });

                } else {
                    return res.sendStatus(403);
                }

            });
        }
    });
});


app.post('/cancelPayment/:userId/:orderId', async function (req, res, next) {
    const {userId, orderId} = req.params;

    sqlClient.query('SELECT cost FROM wdm.payment WHERE "orderId" = $1 AND status = \'PAID\'', [orderId], function (err, result) {
            if (err)
                return next(err);

            if (result.rowCount !== 1) {
                //something went wrong
                return res.sendStatus(404);

            } else {
                let cost = result.rows[0].cost;

                sqlEndpoints.addFunds(userId, cost).then(
                    paymentResult => {
                        sqlClient.query('UPDATE wdm.payment SET status = \'CANCELED\' WHERE "orderId" = $1', [orderId], function (err) {
                                if (err)
                                    return next(err);

                            }
                        )
                        ;
                        res.sendStatus(200)
                    },

                    paymentError => res.send(paymentError));

            }

        }
    );

});


app.get('/status/:orderId', async function (req, res, next) {

    const {orderId} = req.params;

    sqlClient.query('SELECT status FROM wdm.payment WHERE "paymentId" = $1', [orderId], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);

        res.send(result.rows[0].status);
    });
});


module.exports = app;

/**
 * @class Payment
 * @property {string} id
 * @property {number} cost
 * @property {string} order_id
 * @property {string} user_id
 * @property {string} status
 *
 */
