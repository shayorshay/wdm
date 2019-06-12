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

redisApp.use("/users/", require("./handlers/users").app);
redisApp.use("/stock/", require("./handlers/stock").app);
redisApp.use("/orders/", require("./handlers/orders").app);
redisApp.use("/payment/", require("./handlers/payment").app);


sqlApp.use("/users/", require("./handlers-postgres/users").app);
sqlApp.use("/stock/", require("./handlers-postgres/stock").app);
sqlApp.use("/orders/", require("./handlers-postgres/orders").app);
sqlApp.use("/payment/", require("./handlers-postgres/payment").app);

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
