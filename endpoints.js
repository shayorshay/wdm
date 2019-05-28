'use strict';
const request = require("request-promise-native");
const endpoints = require("./config").endpoints;
const prefixes = {
    stock: '/stock',
    orders: '/orders',
    payment: '/payment',
};

module.exports = {
    createUser: async function (name) {
        return request({
            uri: endpoints.users + `/users/create`,
            method: 'GET',
            json: true // Automatically parses the JSON string in the response
        })
    },

    addFunds: async function (id, amount) {
        return request({
            uri: endpoints.users + `/users/credit/add/${id}/${amount}`,
            method: 'POST'
        });
    },

    subtract: async function (id, amount) {
        return request({
            uri: endpoints.users + `/users/credit/subtract/${id}/${amount}`,
            method: 'POST'
        });
    },

    stock: {

        getAvailability: async function (id) {
            return request({
                uri: endpoints.stock + prefixes.stock + `/availability/${id}`,
                method: 'GET'
            });
        },

        subtract: async function (id, amount) {
            return request({
                uri: endpoints.stock + prefixes.stock + `/subtract/${id}/${amount}`,
                method: 'POST'
            });
        },

        add: async function (id, amount) {
            return request({
                uri: endpoints.stock + prefixes.stock +  `/add/${id}/${amount}`,
                method: 'POST'
            });
        },
        create: async function () {
            return request({
                uri: endpoints.stock + prefixes.stock +  '/item/create',
                method: 'POST'
            });
        },
    },

    order: {
        get: async function(id) {
            return request({
                uri: endpoints.orders + prefixes.orders + `/find/${id}`,
                method: 'GET',
                json: true
            });
        }
    },

    payment: {
        getStatus: async function (id) {
            return request({
                uri: endpoints.payment + prefixes.payment + `/status/${id}`,
                method: 'GET'
            });
        }
    }

};

//
// (async function () {
//     // let res = await module.exports.addFunds("asd", 3);
//     let res = await module.exports.createUser("asd");
//
//     console.log(res);
// })();
