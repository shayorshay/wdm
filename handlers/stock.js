
const express = require('express');
const app = express();
const {redisClient, getAllIds, config} = require("../data");

app.get("/", function (req, res) {

    res.send("AKSJDKJASBDJK");
});

module.exports = app;
