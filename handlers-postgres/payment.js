const express = require('express');
const app = express();
const {sqlClient} = require("../data");
const endpoints = require("../endpoints");


app.post("/pay/:userId/:orderId", async function (req, res, next) {
    const {userId, orderId} = req.params;

    sqlClient.query("SELECT SUM(cost) FROM wdm.order_item WHERE order_id = $1", [orderId], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1) {
            //something went wrong -- no items were for found for order
            return res.sendStatus(404);

        } else {
            let cost = result.rows[0].sum;
            endpoints.subtract(userId, cost).then(
                paymentResult => {
                    sqlClient.query("INSERT INTO wdm.payment (id, cost, order_id, user_id, status) VALUES ($1, $2, $3, $4, 'PAID')", [orderId, cost, orderId, userId], function (err, result) {
                        if (err)
                            return next(err);

                    });
                    res.sendStatus(200)
                },

                paymentError => res.send(paymentError));

        }

    });

});


app.post("/cancelPayment/:userId/:orderId", async function (req, res, next) {
    const {userId, orderId} = req.params;

    sqlClient.query("SELECT cost FROM wdm.payment WHERE order_id = $1 AND status = 'PAID'", [orderId], function (err, result) {
        if (err)
            return next(err);

        if (result.rowCount !== 1) {
            //something went wrong
            return res.sendStatus(404);

        } else {
            let cost = result.rows[0].cost;

            endpoints.addFunds(userId, cost).then(

                paymentResult => {
                    sqlClient.query("UPDATE wdm.payment SET status = 'CANCELLED' WHERE order_id = $1", [orderId], function (err, result) {
                        if (err)
                            return next(err);

                    });
                    res.sendStatus(200)
                },

                paymentError => res.send(paymentError));

        }

    });

});


app.get("/status/:orderId", async function (req, res, next) {

    const {orderId} = req.params;

    sqlClient.query("SELECT status FROM wdm.payment WHERE id = $1", [orderId], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);


        res.send({status: result.rows[0].status});
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