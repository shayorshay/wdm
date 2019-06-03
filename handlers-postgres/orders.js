const express = require('express');
const app = express();
const {sqlClient} = require("../data");

app.post("/create/:user_id", async function (req, res, next) {

    const {user_id} = req.params;
    
    // create empty orderItems key
    sqlClient.query(`INSERT INTO wdm.order(userid) VALUES($1) RETURNING id, userid`, [user_id],
           function (err, result) {
            if (err)
                return next(err);

            res.send({id: result.rows[0].id, userid: result.rows[0].userid});
        });
});

app.delete("/remove/:id", function (req, res, next) {

    const {id} = req.params;

    sqlClient.query(`DELETE FROM wdm.order WHERE id = $1`,[id], function (err) {   
        if (err)
            return next(err);

        res.sendStatus(200);
    });
});



module.exports = app;