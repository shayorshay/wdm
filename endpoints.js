'use strict';

const request = require("request-promise-native");
const endpoints = require("./config").endpoints;

/**
 * @typedef {"OK"} OKResponse
 */

function Endpoints(base) {
    base += '/';
    let e = JSON.parse(JSON.stringify(endpoints));

    for (let k in e)
        e[k] += base + k;

    /**
     * @type {{users, stock, payment, orders, payment}}
     */
    this.endpoints = e;

    Object.assign(this, {
        users: {
            /**
             * @class CreateUserResponse
             * @property userId
             */

            /**
             *
             * @param name
             * @return {Promise<CreateUserResponse>}
             */
            createUser: async (name) => {
                return request({
                    body: {name},
                    uri: this.endpoints.users + `/create`,
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
            addFunds: async (userId, amount) => {
                return request({
                    uri: this.endpoints.users + `/credit/add/${userId}/${amount}`,
                    method: 'POST'
                });
            },

            /**
             *
             * @param userId
             * @param amount
             * @return {Promise<OKResponse>}
             */
            subtract: async (userId, amount) => {
                return request({
                    uri: this.endpoints.users + `/credit/subtract/${userId}/${amount}`,
                    method: 'POST'
                });
            },

            /**
             *
             * @param userId
             * @return {Promise<User>}
             */
            info: async (userId) => {
                return request({
                    uri: this.endpoints.users + `/find/${userId}`,
                    json: true, // Automatically parses the JSON string in the response
                    method: 'GET'
                });
            }
        },

        stock: {

            getAvailability: async (id) => {
                return request({
                    uri: this.endpoints.stock + `/availability/${id}`,
                    method: 'GET'
                });
            },

            subtract: async (id, amount) => {
                return request({
                    uri: this.endpoints.stock + `/subtract/${id}/${amount}`,
                    method: 'POST'
                });
            },

            subtractOrder: async (orderId) => {
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

            add: async (id, amount) => {
                return request({
                    uri: this.endpoints.stock + `/add/${id}/${amount}`,
                    method: 'POST'
                });
            },
            create: async () => {
                return request({
                    uri: this.endpoints.stock + '/item/create',
                    method: 'POST'
                });
            },
        },

        order: {
            get: async (id) => {
                return request({
                    uri: this.endpoints.orders + `/find/${id}`,
                    method: 'GET',
                    json: true
                });
            }
        },

        payment: {
            pay: async (userId, orderId) => {
                return request({
                    uri: this.endpoints.payment + `/pay/${userId}/${orderId}`,
                    method: 'POST'
                });
            },
            cancelPayment: async (userId, orderId) => {
                return request({
                    uri: this.endpoints.payment + `/cancelPayment/${userId}/${orderId}`,
                    method: 'POST'
                });
            },
            getStatus: async (id) => {
                return request({
                    uri: this.endpoints.payment + `/status/${id}`,
                    method: 'GET'
                });
            }
        }

    });
}

let sqlEndpoints = new Endpoints('sql'), redisEndpoints = new Endpoints('redis');

module.exports = {sqlEndpoints, redisEndpoints};

if (require.main === module) {
    // noinspection JSIgnoredPromiseFromCall
    main();
}

async function main() {
    let handlers = redisEndpoints;
    let result;
    /**
     *
     * @type {CreateUserResponse}
     */
    let {userId} = await handlers.users.createUser("mihai");
    console.log(require('util').inspect(userId, {depth: null, colors: true}));

    result = await handlers.users.addFunds(userId, 50);
    console.log(require('util').inspect(result, {depth: null, colors: true}));

    result = await handlers.users.subtract(userId, 50);
    console.log(require('util').inspect(result, {depth: null, colors: true}));

    result = await handlers.users.info(userId);
    console.log(require('util').inspect(result, {depth: null, colors: true}));
}
