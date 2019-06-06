'use strict';

const request = require("request-promise-native");
const endpoints = require("./config").endpoints;
const prefixes = {
    stock: '/stock',
    orders: '/orders',
    payment: '/payment',
};

/**
 * @typedef {"OK"} OKResponse
 */

const handlers = {
    /**
     * @class CreateUserResponse
     * @property userId
     */

    /**
     *
     * @param name
     * @return {Promise<CreateUserResponse>}
     */
    createUser: async function (name) {
        return request({
            body: {name},
            uri: endpoints.users + `/users/create`,
            method: 'POST',
            json: true // Automatically parses the JSON string in the response
        })
    },

    /**
     *
     * @param userId
     * @param amount
     * @return {Promise<OKResponse>}
     */
    addFunds: async function (userId, amount) {
        return request({
            uri: endpoints.users + `/users/credit/add/${userId}/${amount}`,
            method: 'POST'
        });
    },

    /**
     *
     * @param userId
     * @param amount
     * @return {Promise<OKResponse>}
     */
    subtract: async function (userId, amount) {
        return request({
            uri: endpoints.users + `/users/credit/subtract/${userId}/${amount}`,
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
                    handlers.stock.subtract(item, orderItems[item]);
                } catch (e) {
                    while (i >= 0) {
                        let item = keys[i];

                        handlers.stock.add(item, orderItems[item]);
                        i--;
                    }

                    throw e;
                }

            }
        },

        add: async function (id, amount) {
            return request({
                uri: endpoints.stock + prefixes.stock + `/add/${id}/${amount}`,
                method: 'POST'
            });
        },
        create: async function () {
            return request({
                uri: endpoints.stock + prefixes.stock + '/item/create',
                method: 'POST'
            });
        },
    },

    order: {
        get: async function (id) {
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
                uri: endpoints.payment + prefixes.payment + `/pay/${userId}/${orderId}`,
                method: 'POST'
            });
        },
        cancelPayment: async function (userId, orderId) {
            return request({
                uri: endpoints.payment + prefixes.payment + `/cancelPayment/${userId}/${orderId}`,
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

if (require.main === module) {
    // noinspection JSIgnoredPromiseFromCall
    main();
}

async function main() {
    let result;
    /**
     *
     * @type {CreateUserResponse}
     */
    let {userId} = await handlers.createUser("mihai");
    console.log(require('util').inspect(userId, {depth: null, colors: true}));

    result = await handlers.addFunds(userId, 50);
    console.log(require('util').inspect(result, {depth: null, colors: true}));

    result = await handlers.subtract(userId, 50);
    console.log(require('util').inspect(result, {depth: null, colors: true}));

}
