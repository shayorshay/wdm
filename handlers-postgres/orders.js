const express = require('express');
const app = express();
const {sqlClient} = require("../data");
const endpoints = require("../endpoints");

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
    
    
    sqlClient.query(`SELECT * FROM wdm.order WHERE id = $1`,[id], async function (err, orderResult) {
        if (err)
            return next(err);
        if (!orderResult.rows.length)
            return res.sendStatus(404);
        
        user_id = orderResult.rows[0].userid;
        let status = await endpoints.payment.getStatus(id);
            let orderItems = undefined;
            sqlClient.query(`SELECT * FROM wdm.order_item WHERE order_id = $1`,[id], async function (err, order_item) {
            if (err)
                return next(err);
            if (!order_item.rows.length)
                return res.sendStatus(404);
    
            orderItems = order_item.rows;
            let result = 
            {
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

app.post("/checkout/:orderId", function (req,res,next){
    
    const {orderId} = req.params;
    // get userid
    sqlClient.query(`SELECT userid FROM wdm.order WHERE id = $1`, [orderId], function(err, result){
        if (err)
            return next(err);
        if (!result.rows.length)
            return res.sendStatus(404);
        
            
        userId = result.rows[0].userid;
        // check the status
        endpoints.payment.getStatus(orderId).then(order_status=>
            {
                
                // finished
                if ((order_status == "FINISHED")||(order_status == "CANCELED"))
                    return res.sendStatus(403);
                else if(order_status == "PAID")
                {
                    //subtract the stocks
                    endpoints.order.get(orderId).then(order => {
                     
                        Object.entries(order.orderItems).forEach(item =>{

                        endpoints.stock.subtract(item[1].item_id,item[1].quantity);
            
                        });
        
                     });
                     // set status
                     sqlClient.query("UPDATE wdm.payment SET status = 'FINISHED' WHERE order_id = $1", [orderId], function (err, result) {
                        if (err)
                            return next(err);

                    });
                     return res.sendStatus(200);
                }
                else{
                    // calling the payment function
                    endpoints.payment.pay(userId,orderId).then(
                        checkoutResult=>{
                            // subtract the stocks
                            endpoints.order.get(orderId).then(order => {
                     
                                Object.entries(order.orderItems).forEach(item =>{
        
                                endpoints.stock.subtract(item[1].item_id,item[1].quantity);
                    
                                });
                
                             });  
                            
                              // set status
                            sqlClient.query("UPDATE wdm.payment SET status = 'FINISHED' WHERE order_id = $1", [orderId], function (err, result) {
                                if (err)
                                return next(err);

                            });
                             return res.sendStatus(200);
                        },
                        checkoutError=>{
                            if (err)
                                return next(err);
                        });
                   
                }
            });
        
    });
    
});


module.exports = app;