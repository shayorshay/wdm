'use strict';
const request = require("request-promise-native");
const endpoints = require("./config").endpoints;

module.exports = {
    createUser: async function (name) {
        return request({
            uri:  endpoints.users + `/users/create`,
            method: 'GET',
            json: true // Automatically parses the JSON string in the response
        })
    },

    addFunds: async function (id, amount) {
        return request({
            uri: endpoints.users + `/users/credit/add/${id}/${amount}`,
            method: 'POST'
        });
    }

};

//
// (async function () {
//     // let res = await module.exports.addFunds("asd", 3);
//     let res = await module.exports.createUser("asd");
//
//     console.log(res);
// })();
