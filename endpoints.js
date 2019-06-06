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

            getAvailability: async (itemId) => {
                return request({
                    uri: this.endpoints.stock + `/availability/${itemId}`,
                    json: true,
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
                    method: 'POST',
                    json: true
                });
            },
            create: async (price) => {
                return request({
                    uri: this.endpoints.stock + '/item/create',
                    body: {price},
                    json: true, // Automatically parses the JSON string in the response
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
    console.log("Beginning tests");
    await testEndpoint(redisEndpoints);
    console.log("Redis DONE");
    await testEndpoint(sqlEndpoints);
    console.log("SQL DONE");
}

async function testEndpoint(handlers) {
    let assert = require("assert");

    function assertObj(tr, received) {
        for (let k in tr) {
            assert.equal(tr[k], received[k]);
        }
    }

    let result;
    /**
     *
     * @type {CreateUserResponse}
     */
    let {userId} = await handlers.users.createUser("mihai");
    console.log(require('util').inspect(userId, {depth: null, colors: true}));

    result = await handlers.users.addFunds(userId, 50);
    assert.strictEqual(result, "OK");

    result = await handlers.users.subtract(userId, 49);
    assert.strictEqual(result, "OK");

    result = await handlers.users.info(userId);
    assert.equal(result.credit, 1);
    assertObj({name: "mihai"}, result);

    result = await handlers.users.addFunds(userId, 50);
    assert.strictEqual(result, "OK");

    let {itemId} = await handlers.stock.create(10);
    console.log(require('util').inspect(itemId, {depth: null, colors: true}));

    result = await handlers.stock.add(itemId, 30);
    assert.strictEqual(result, "OK");

    result = await handlers.stock.getAvailability(itemId);
    assertObj({
        stock: '30',
        price: '10'
    }, result);


    result = await handlers.stock.subtract(itemId, 10);
    console.log(require('util').inspect(result, {depth: null, colors: true}));

    result = await handlers.stock.getAvailability(itemId);
    assertObj({
        stock: '20',
        price: '10'
    }, result);

    // todo
    // result = await handlers.stock.subtractOrder(itemId);
    // assertObj({
    //     number: '20',
    //     price: '10'
    // }, result);


}
