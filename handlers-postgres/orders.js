'use strict';

const express = require('express');
const app = express();
const {sqlClient} = require("../data");
const endpoints = require("../endpoints");

app.post("/create/:user_id", function (req, res, next) {

    const {user_id} = req.params;

    // create empty orderItems key
    sqlClient.query(`INSERT INTO wdm.order(userid)
                     VALUES ($1) RETURNING id, userid`, [user_id],
        function (err, result) {
            if (err)
                return next(err);

            res.send({orderId: result.rows[0].id});
        });
});

app.delete("/remove/:id", function (req, res, next) {

    const {id} = req.params;

    sqlClient.query(`DELETE
                     FROM wdm.order
                     WHERE id = $1`, [id], function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});

app.get("/find/:id", function (req, res, next) {
    const {id} = req.params;

    sqlClient.query(`SELECT *
                     FROM wdm.order
                     WHERE id = $1`, [id], async function (err, orderResult) {
        let status;
        if (err)
            return next(err);

        if (!orderResult.rows.length)
            return res.sendStatus(404);

        let user_id = orderResult.rows[0].userid;
        try {
            status = await endpoints.payment.getStatus(id);
        } catch (e) {
            return next(e);
        }
        sqlClient.query(`SELECT *
                         FROM wdm.order_item
                         WHERE order_id = $1`, [id], function (err, order_item) {
            if (err)
                return next(err);
            if (!order_item.rows.length)
                return res.sendStatus(404);

            let orderItems = order_item.rows;
            let result = {
                user_id,
                orderItems,
                status
            };
            res.send(result);
        });


    });

});

app.post("/additem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    sqlClient.query(`SELECT *
                     FROM wdm.order_item
                     WHERE order_id = $1
                       AND item_id = $2`, [orderId, itemId], function (err, result) {
        // no rows in table where order_id = orderId
        if (!result.rows.length) {
            sqlClient.query(`INSERT INTO wdm.order_item(order_id, item_id, quantity)
                             VALUES ($1, $2, $3) RETURNING order_id, item_id, quantity `, [orderId, itemId, 1], function (err, result) {
                if (err)
                    return next(err);


                res.send(result.rows[0]);
            })
        } else {
            sqlClient.query(`UPDATE wdm.order_item
                             SET quantity = quantity + 1
                             WHERE order_id = $1
                               AND item_id = $2`, [orderId, itemId], function (err, result) {
                if (err)
                    return next(err);

                res.send(result.rows[0]);
            })
        }

    });

});

app.post("/removeitem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    // subtract item to orderItems (hincrby will create a hashkey even if it is not created yet.
    sqlClient.query(`SELECT *
                     FROM wdm.order_item
                     WHERE order_id = $1
                       AND item_id = $2`, [orderId, itemId], function (err, result) {
        // no rows in table where order_id = orderId
        if (!result.rows.length)
            return res.sendStatus(404);


        sqlClient.query(`UPDATE wdm.order_item
                         SET quantity = quantity - 1
                         WHERE order_id = $1
                           AND item_id = $2
                           AND quantity > 0`, [orderId, itemId], function (err, result) {
            if (err)
                return next(err);

            res.send(result.rows[0]);
        })

    });
});

app.post("/checkout/:orderId", function (req, res, next) {
    const {orderId} = req.params;
    // get userid
    sqlClient.query(`SELECT userid
                     FROM wdm.order
                     WHERE id = $1`, [orderId], async function (err, result) {
        let order_status;
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);


        let userId = result.rows[0].userid;

        try {
            order_status = await endpoints.payment.getStatus(orderId);
        } catch (e) {
            return next(e);
        }

        // check the status
        // finished
        if (order_status === "FINISHED" || order_status === "CANCELED")
            return res.sendStatus(403);
        else if (order_status === "PAID") {
            try {
                await subtract();
            } catch (e) {
                return next(e);
            }
        } else {
            // calling the payment function
            try {
                endpoints.payment.pay(userId, orderId);
            } catch (e) {
                return next(e);
            }

            try {
                await subtract();
            } catch (e) {
                try {
                    await endpoints.payment.cancelPayment(userId, orderId);
                } catch (e) {
                    return next(e);
                }

                res.sendStatus(403);
            }
        }
    });

    async function subtract() {
        //subtract the stocks
        await endpoints.stock.subtractOrder(orderId);

        // set status
        sqlClient.query("UPDATE wdm.payment SET status = 'FINISHED' WHERE order_id = $1", [orderId],
            function (err) {
                if (err)
                    return next(err);

                res.sendStatus(200);
            });
    }
});

module.exports = app;
