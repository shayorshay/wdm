'use strict';

const express = require('express');
const app = express();
const {sqlClient, sqlEndpoints} = require('../data');


app.post('/pay/:userId/:orderId', async function (req, res, next) {
    let order;
    /**
     * @type {string}
     */
    const {userId, orderId} = req.params;

    // Get order from order service
    try {
        order = await sqlEndpoints.orders.get(orderId);
    } catch (e) {
        return next(e);
    }

    let requests = [];
    for (let itemId in order.orderItems) {
        requests.push(sqlEndpoints.stock.getAvailability(itemId));
    }

    let responses = await Promise.all(requests);

    let sum = 0;
    for (let response of responses) {
        sum += response.price * order.orderItems[response.itemId];
    }

    try {
        await sqlEndpoints.users.subtract(userId, sum);
    } catch (e) {
        return next(e);
    }

    // language=PostgreSQL
    sqlClient.query('UPDATE wdm.payment SET cost = $1 WHERE "orderId" = $2', [sum, orderId], function (err, result) {
        if (err)
            return next(err);

        res.send();
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

    sqlClient.query('SELECT status FROM wdm.payment WHERE "orderId" = $1', [orderId], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length || result.rows[0].cost === 0)
            return res.send("NOT_PAYED");

        res.send("PAYED");
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
