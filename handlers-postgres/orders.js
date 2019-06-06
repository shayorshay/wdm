'use strict';

const express = require('express');
const app = express();
const {sqlClient, sqlEndpoints} = require("../data");

app.post("/create/:userId", function (req, res, next) {

    const {userId} = req.params;

    // create empty orderItems key
    sqlClient.query(`INSERT INTO wdm.order("userId")
                     VALUES ($1) RETURNING "userId", "orderId"`, [userId],
        function (err, result) {
            if (err)
                return next(err);

            res.send({orderId: result.rows[0].orderId});
        });
});

app.delete("/remove/:orderId", function (req, res, next) {

    const {orderId} = req.params;

    // language=PostgreSQL
    sqlClient.query(`DELETE
                     FROM wdm.order_item
                     WHERE "orderId" = ${orderId};DELETE
                     FROM wdm.order
                     WHERE "orderId" = ${orderId}`, function (err) {
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});

app.get("/find/:orderId", function (req, res, next) {
    const {orderId} = req.params;

    sqlClient.query(`SELECT *
                     FROM wdm.order
                     WHERE "orderId" = $1`, [orderId], async function (err, orderResult) {
        let status;
        if (err)
            return next(err);

        if (!orderResult.rows.length)
            return res.sendStatus(404);

        let userId = orderResult.rows[0].userId;
        try {
            status = await sqlEndpoints.payment.getStatus(orderId);
        } catch (e) {
            // no status yet
            status = '';
        }
        sqlClient.query(`SELECT *
                         FROM wdm.order_item
                         WHERE "orderId" = $1`, [orderId], function (err, order_item) {
            if (err)
                return next(err);
            if (!order_item.rows.length)
                return res.sendStatus(404);

            let orderItems = {};

            for (let item of order_item.rows)
                orderItems[item.itemId] = item.quantity;

            let result = {
                userId,
                orderItems,
                status
            };
            res.send(result);
        });


    });

});

app.post("/addItem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;
    // if order finished, stop the function
    sqlClient.query("SELECT status FROM wdm.order WHERE \"orderId\" = $1", [orderId], async function (err, result) {
        if (!result.rows.length)
            return res.sendStatus(404);

        if (result.rows[0].status === "FINISHED")
            return res.sendStatus(403);

        // language=PostgreSQL
        sqlClient.query(`INSERT INTO wdm.order_item ("orderId", "itemId", quantity)
                         VALUES ($1, $2, 1)
                         ON CONFLICT ("orderId", "itemId") DO UPDATE SET quantity = excluded.quantity + 1 `, [orderId, itemId], function (err) {
            if (err)
                return next(err);

            res.sendStatus(200);
        });
    });
});

app.delete("/removeItem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    // check status
    sqlClient.query("SELECT status FROM wdm.order WHERE \"orderId\" = $1", [orderId], function (err, result) {
        if (!result.rows.length)
            return res.sendStatus(404);

        if (result.rows[0].status === "FINISHED")
            return res.sendStatus(403);

        sqlClient.query(`UPDATE wdm.order_item
                         SET quantity = quantity - 1
                         WHERE "orderId" = $1
                           AND "itemId" = $2
                           AND quantity > 0`, [orderId, itemId], function (err, result) {
            if (err)
                return next(err);

            if (result.rowCount !== 1)
                return res.sendStatus(404);

            res.sendStatus(200);
        });
    });
});

app.post("/checkout/:orderId", function (req, res, next) {
    const {orderId} = req.params;
    // get userId
    sqlClient.query(`SELECT "userId"
                     FROM wdm.order
                     WHERE "orderId" = $1`, [orderId], async function (err, result) {
        let order_status;
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);


        let userId = result.rows[0].userId;

        try {
            order_status = await sqlEndpoints.payment.getStatus(orderId);
        } catch (e) {
            return next(e);
        }

        // check the status
        sqlClient.query("SELECT status FROM wdm.order WHERE \"orderId\" = $1", [orderId], async function (err, result) {

            if (result.rows[0].status === "FINISHED" || payment_status === "CANCELED")
                return res.sendStatus(403);
            else if (payment_status === "PAID") {
                try {
                    await sqlEndpoints.stock.subtractOrder_sql(orderId);
                } catch (e) {
                    try {
                        await sqlEndpoints.payment.cancelPayment(userId, orderId);
                    } catch (e) {
                        return next(e);
                    }

                    res.sendStatus(403);
                }
            } else {

                try {
                    await sqlEndpoints.stock.subtractOrder_sql(orderId);
                } catch (e) {

                    return next(e);
                }
                // calling the payment function
                try {
                    sqlEndpoints.payment.pay(userId, orderId);
                    await set_status();

                } catch (e) {
                    try {
                        await sqlEndpoints.payment.cancelPayment(userId, orderId);
                    } catch (e) {
                        return next(e);
                    }

                    res.sendStatus(403);
                }
            }
        })
    });

    async function set_status() {
        //subtract the stocks


        // set status
        sqlClient.query("UPDATE wdm.payment SET status = 'FINISHED' WHERE \"orderId\" = $1", [orderId],
            function (err) {
                if (err)
                    return next(err);

                res.sendStatus(200);
            });
    }
});

module.exports = app;
