
const express = require('express');
const app = express();
const {redisClient, getAllIds, config, genId} = require("../data");

app.get("/", function (req, res) {

    res.send("AKSJDKJASBDJK");
});

module.exports = app;
