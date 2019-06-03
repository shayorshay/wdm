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

app.get("/find/:id", function (req, res, next) {
    const {id} = req.params;

    sqlClient.query(`SELECT * FROM wdm.order WHERE id = $1`,[id], async function (err, result) {
        if (err)
            return next(err);
        if (!result.rows.length)
            return res.sendStatus(404);

        res.send(result.rows[0]);
    });
});

app.post("/additem/:orderId/:itemId", function (req, res, next) {
    const {orderId, itemId} = req.params;

    sqlClient.query(`SELECT * FROM wdm.order_item WHERE order_id = $1 AND item_id = $2`,[orderId,itemId], async function (err, result) {
        // no rows in table where order_id = orderId
        if (!result.rows.length){
            sqlClient.query(`INSERT INTO wdm.order_item(order_id,item_id,quantity) VALUES($1,$2,$3) RETURNING order_id,item_id,quantity `,[orderId,itemId,1], function (err,result) {
                if (err)
                    return next(err);
                
                
                res.send(result.rows[0]);
            })
        }
        
        else
        {
            sqlClient.query(`UPDATE wdm.order_item SET quantity = quantity +1 WHERE order_id = $1 AND item_id = $2`,[orderId,itemId], function (err,result) {
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
    sqlClient.query(`SELECT * FROM wdm.order_item WHERE order_id = $1 AND item_id = $2`,[orderId,itemId], async function (err, result) {
        // no rows in table where order_id = orderId
        if (!result.rows.length)
            return res.sendStatus(404);
        else
        {
            sqlClient.query(`UPDATE wdm.order_item SET quantity = quantity -1 WHERE order_id = $1 AND item_id = $2 AND quantity>0`,[orderId,itemId], function (err,result) {
                if (err)
                    return next(err);
        
                res.send(result.rows[0]);
            })
        }
        


    });
});

module.exports = app;