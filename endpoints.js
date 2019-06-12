'use strict';

const request = require("request-promise-native");
const endpoints = require("./config").endpoints;
const _endpoints = endpoints;

/**
 * @typedef {"OK"} OKResponse
 */

function Endpoints(base, modules, endpoints=_endpoints) {
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
            addFunds: modules ? modules.users.addFunds : async (userId, amount) => {
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
            subtract: modules ? modules.users.subtract : async (userId, amount) => {
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

            getAvailability: modules? modules.stock.getAvailability:async (itemId) => {
                return request({
                    uri: this.endpoints.stock + `/availability/${itemId}`,
                    json: true,
                    method: 'GET'
                });
            },

            subtract: modules? modules.stock.subtractStocks: async (id, amount) => {
                return request({
                    uri: this.endpoints.stock + `/subtract/${id}/${amount}`,
                    method: 'POST'
                });
            },

            subtractOrder: async (orderItems) => {
                let keys = Object.keys(orderItems);

                for (let i = 0; i < keys.length; i++) {
                    let item = keys[i];
                    try {
                        if (orderItems[item])
                            await this.stock.subtract(item, orderItems[item]);

                    } catch (e) {
                        while (--i >= 0) {
                            let item = keys[i];

                            if (orderItems[item])
                                await this.stock.add(item, orderItems[item]);
                        }

                        throw e;
                    }

                }
            },

            add:  async (id, amount) => {
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

        orders: {
            get: modules? modules.orders.getOrder: async (orderId) => {
                return request({
                    uri: this.endpoints.orders + `/find/${orderId}`,
                    method: 'GET',
                    json: true
                });
            },

            create: async (userId) => {
                return request({
                    uri: this.endpoints.orders + `/create/${userId}`,
                    method: 'POST',
                    json: true
                });
            },

            remove: async (orderId) => {
                return request({
                    uri: this.endpoints.orders + `/remove/${orderId}`,
                    method: 'DELETE'
                });
            },

            addItem: async (orderId, itemId) => {
                return request({
                    uri: this.endpoints.orders + `/addItem/${orderId}/${itemId}`,
                    method: 'POST'
                });
            },

            removeItem: async (orderId, itemId) => {
                return request({
                    uri: this.endpoints.orders + `/removeItem/${orderId}/${itemId}`,
                    method: 'DELETE'
                });
            },

            checkout: async (orderId) => {
                return request({
                    uri: this.endpoints.orders + `/checkout/${orderId}`,
                    method: 'POST'
                });
            },
        },

        payment: {
            pay: modules? modules.payment.pay: async (userId, orderId) => {
                return request({
                    uri: this.endpoints.payment + `/pay/${userId}/${orderId}`,
                    method: 'POST'
                });
            },
            cancelPayment: modules? modules.payment.cancelPayment:async (userId, orderId) => {
                return request({
                    uri: this.endpoints.payment + `/cancelPayment/${userId}/${orderId}`,
                    method: 'POST'
                });
            },
            getStatus: modules? modules.payment.getStatus: async (orderId) => {
                return request({
                    uri: this.endpoints.payment + `/status/${orderId}`,
                    method: 'GET'
                });
            }
        }

    });
}

let sqlEndpoints = new Endpoints('sql',  require('./handlers-postgres')), redisEndpoints = new Endpoints('redis', require('./handlers'));

module.exports = {sqlEndpoints, redisEndpoints};

if (require.main === module) {
    // noinspection JSIgnoredPromiseFromCall
    main();
}

async function main() {
    console.log("Beginning tests");
    await testEndpoint(new Endpoints('redis', undefined, require("./config")["endpoints-test"]));
    console.log("Redis DONE");
    await testEndpoint(new Endpoints('sql', undefined, require("./config")["endpoints-test"]));
    console.log("SQL DONE");
}

/**
 *
 * @param {Endpoints} handlers
 * @return {Promise<void>}
 */
async function testEndpoint(handlers) {
    const assert = require("assert");

    function assertObj(tr, received) {
        for (let k in tr) {
            if (typeof tr[k] === "object")
                assertObj(tr[k], received[k]);
            else
                assert.strictEqual(tr[k], received[k]);
        }
    }

    async function assertWrongStatus(promise, code) {
        try {
            await promise;
        } catch (e) {
            assert.strictEqual(e.statusCode, code);
            return;
        }

        throw new Error("Call succeeded");
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
    assertObj({name: "mihai", credit: 1}, result);

    result = await handlers.users.addFunds(userId, 49);
    assert.strictEqual(result, "OK");

    let {itemId} = await handlers.stock.create(10);
    console.log(require('util').inspect(itemId, {depth: null, colors: true}));

    result = await handlers.stock.add(itemId, 30);
    assert.strictEqual(result, "OK");

    result = await handlers.stock.getAvailability(itemId);
    assertObj({
        stock: 30,
        price: 10
    }, result);


    result = await handlers.stock.subtract(itemId, 10);
    console.log(require('util').inspect(result, {depth: null, colors: true}));

    result = await handlers.stock.getAvailability(itemId);
    assertObj({
        stock: 20,
        price: 10
    }, result);

    {
        let {orderId} = await createAndPopulateOrder();

        result = await handlers.orders.remove(orderId);
        assert.strictEqual(result, "OK");

        await assertWrongStatus(handlers.orders.get(orderId), 404);
    }

    {
        let {orderId} = await createAndPopulateOrder();

        result = await handlers.payment.getStatus(orderId);
        assert.strictEqual(result, "NOT_PAYED");

        result = await handlers.users.info(userId);
        assertObj({name: "mihai", credit: 50}, result);


        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.checkout(orderId);
        console.log(require('util').inspect(result, {depth: null, colors: true}));

        result = await handlers.users.info(userId);
        assertObj({name: "mihai", credit: 30}, result);


        await assertWrongStatus(handlers.orders.checkout(orderId), 403);
    }


    {
        let {orderId} = await createAndPopulateOrder();

        result = await handlers.payment.getStatus(orderId);
        assert.strictEqual(result, "NOT_PAYED");

        result = await handlers.users.info(userId);
        assertObj({name: "mihai", credit: 30}, result);


        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.get(orderId);
        console.log(require('util').inspect(result, {depth: null, colors: true}));


        await assertWrongStatus(handlers.orders.checkout(orderId), 403);
    }

    {   //testing not enough in stock
        let {orderId} = await createAndPopulateOrder();

        result = await handlers.orders.get(orderId);
        console.log(require('util').inspect(result, {depth: null, colors: true}));

        result = await handlers.stock.getAvailability(itemId);
        console.log(require('util').inspect(result, {depth: null, colors: true}));

        result = await handlers.stock.subtract(itemId, 18);
        result = await handlers.stock.getAvailability(itemId);
        assertObj({
            stock: 0,
            price: 10
        }, result);

        await assertWrongStatus(handlers.orders.checkout(orderId), 403);

    }

    async function createAndPopulateOrder() {
        let {orderId} = await handlers.orders.create(userId);

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        let orderItems = {};
        orderItems[itemId] = 1;
        let order = {orderItems, status: 'NOT_PAYED'};
        result = await handlers.orders.get(orderId);
        assertObj(order, result);

        result = await handlers.orders.addItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.get(orderId);
        orderItems[itemId] = 2;
        assertObj(order, result);

        result = await handlers.orders.removeItem(orderId, itemId);
        assert.strictEqual(result, "OK");

        result = await handlers.orders.get(orderId);
        orderItems[itemId] = 1;
        assertObj(order, result);

        return {orderId}
    }

}
