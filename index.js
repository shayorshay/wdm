'use strict';

const express = require('express');

/**
 * @type {app}
 */
const app = express();

app.use(express.json());

const redisApp = express();
const sqlApp = express();

/**
 * @class User
 * @property {string} id
 * @property {string} name
 * @property {number} credit
 */

redisApp.use("/users/", require("./handlers/users"));
redisApp.use("/stock/", require("./handlers/stock"));
redisApp.use("/orders/", require("./handlers/orders"));
redisApp.use("/payment/", require("./handlers/payment"));


sqlApp.use("/users/", require("./handlers-postgres/users"));
sqlApp.use("/stock/", require("./handlers-postgres/stock"));
sqlApp.use("/orders/", require("./handlers-postgres/orders"));
sqlApp.use("/payment/", require("./handlers-postgres/payment"));

app.use("/redis/", redisApp);
app.use("/sql/", sqlApp);

app.use(function (err, req, res, next) {
    let code = extractStatusCode(err);
    if (code)
        res.status(code).send(err);
    else {
        console.error(err);
        res.status(500).send(new ErrorWithCause('Something broke!', err));
    }
});

function extractStatusCode(err) {
    do {
        if (err.statusCode)
            return err.statusCode
    } while ((err = err.cause)) ;
}

app.listen(process.env.NODE_PORT || 8000);
