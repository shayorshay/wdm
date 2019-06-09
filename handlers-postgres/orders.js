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
                return next(new ErrorWithCause("Encountered an error.", err));

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
            return next(new ErrorWithCause("Encountered an error.", err));

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
            return next(new ErrorWithCause("Encountered an error.", err));

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
                return next(new ErrorWithCause("Encountered an error.", err));
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
                         ON CONFLICT ("orderId", "itemId") DO UPDATE SET quantity = excluded.quantity + wdm.order_item.quantity`, [orderId, itemId], function (err) {
            if (err)
                return next(new ErrorWithCause("Encountered an error.", err));

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
                return next(new ErrorWithCause("Encountered an error.", err));

            if (result.rowCount !== 1)
                return res.sendStatus(404);

            res.sendStatus(200);
        });
    });
});

app.post("/checkout/:orderId", async function (req, res, next) {
    // calling payment service
    const {orderId} = req.params;
    let order_status;

    // check status
    try {
        order_status = await sqlEndpoints.payment.getStatus(orderId);
    } catch (e) {
        return next(new ErrorWithCause("Failed to get status", e));
    }

    if (order_status === "PAYED")
        return next(new WebServiceError("Already payed", 403));


    // language=PostgreSQL
    sqlClient.query(`SELECT * FROM wdm.order_item WHERE "orderId" = ${orderId}; SELECT "userId" FROM wdm."order" where "orderId" = ${orderId};`, async function (err, results) {
        if (err)
            return next(new ErrorWithCause("Encountered an error.", err));

        if (!results[1].rows)
            return next(new WebServiceError("Could not find order id", 404));


        let userId = results[1].rows[0].userId;

        try {
            await sqlEndpoints.payment.pay(userId, orderId);
        } catch (e) {
            return next(new WebServiceError("Failed payment", 403, e));
        }

        let orderItems = {};
        for (let row of results[0].rows) {
            orderItems[row.itemId] = row.quantity;
        }
        try {
            await sqlEndpoints.stock.subtractOrder(orderItems);
        } catch (e) {
            try {
                await sqlEndpoints.payment.cancelPayment(userId, orderId);
            } catch (e) {
                return next(new Error(e.message));
            }

            return next(new WebServiceError("Failed subtracting stock", 403, e));
        }

        res.sendStatus(200);

    });
});

module.exports = {app};
