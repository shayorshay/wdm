'use strict';

const request = require("request-promise-native");
const endpoints = require("./config").endpoints;
const prefixes = {
    stock: '/stock',
    orders: '/orders',
    payment: '/payment',
};

const handlers = {
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

        subtractOrder: async function (orderId) {
            let {orderItems} = await handlers.order.get(orderId);
            let keys = Object.keys(orderItems);

            for (let i = 0; i < keys.length; i++) {
                let item = keys[i];
                try {
                    handlers.stock.subtract(item, parseInt(orderItems[item]));
                    
                } catch (e) {
                    while (i >= 0) {
                        let item = keys[i];

                        handlers.stock.add(item, parseInt(orderItems[item]));
                        i--;
                    }

                    throw e;
                }

            }
        },

        subtractOrder_sql: async function (orderId) {
            let {orderItems} = await handlers.order.get(orderId);
            let keys = Object.keys(orderItems);

            for (let i = 0; i < keys.length; i++) {
                let item = keys[i];
                console.log(orderItems[item].item_id,orderItems[item].quantity);
                try {
                    handlers.stock.subtract(orderItems[item].item_id, orderItems[item].quantity);
                    
                } catch (e) {
                    while (i >= 0) {
                        let item = keys[i];

                        handlers.stock.add(orderItems[item].item_id, orderItems[item].quantity);
                        i--;
                    }

                    throw e;
                }

            }
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
        pay: async function (userId, orderId) {
            return request({
                uri: endpoints.payment + prefixes.payment +  `/pay/${userId}/${orderId}`,
                method: 'POST'
            });
        },
        cancelPayment: async function (userId, orderId) {
            return request({
                uri: endpoints.payment + prefixes.payment +  `/cancelPayment/${userId}/${orderId}`,
                method: 'POST'
            });
        },
        getStatus: async function (id) {
            return request({
                uri: endpoints.payment + prefixes.payment + `/status/${id}`,
                method: 'GET'
            });
        }
    }

};

module.exports = handlers;
