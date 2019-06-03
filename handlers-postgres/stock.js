const express = require('express');
const app = express();
const {sqlClient} = require("../data");

const colNames = {
    number: "number",
    id: "id",
    price: "price"
};

app.get("/availability/:id", function (req, res, next) {
    /**
     * @type {string}
     */
    const {id} = req.params;

    // language=PostgreSQL
    sqlClient.query("SELECT * FROM wdm.order WHERE id = $1", [id], function (err, result) {
        if (err)
            return next(err);

        if (!result.rows.length)
            return res.sendStatus(404);

        res.send(result.rows[0]);
    });
});

app.post("/subtract/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;


    // language=PostgreSQL
    sqlClient.query("UPDATE wdm.item SET stock = stock - $2 WHERE id = $1 AND stock >= $2", [itemId, number], function (err, result) {
        if (err)
            return next(err);

        if (!result.rowCount) {
            // language=PostgreSQL
            return sqlClient.query("SELECT 1 FROM wdm.item WHERE id = $1", [itemId], function (err, result) {
                if (err)
                    return next(err);

                if (result.rows.length)
                    return res.sendStatus(403);

                res.sendStatus(404);
            });
        }

        res.sendStatus(200);
    });
});

app.post("/add/:itemId/:number", function (req, res, next) {
    const {itemId, number} = req.params;

    // language=PostgreSQL
    sqlClient.query("UPDATE wdm.item SET stock = stock - $2 WHERE id = $1 AND stock >= $2", [itemId, number], function (err, result) {
        if (err)
            return next(err);

        if (!result.rowCount)
            return res.sendStatus(404);

        res.sendStatus(200);
    });
});

app.post("/item/create", function (req, res, next) {
    const price = Math.floor(Math.random() * 10) + 1;
    // language=PostgreSQL
    sqlClient.query("INSERT INTO wdm.item(cost, stock) VALUES ($1, $2) RETURNING id", [price, 0], function (err, result) {
        if (err)
            return next(err);

        const newItem = {id: result.rows[0].id, number: 0, price};

        res.send(newItem);
    });
});

module.exports = app;

/**
 * @class Stock
 * @property {string} id
 * @property {int} number
 * @property {int} price
 */
