DROP SCHEMA wdm CASCADE;
CREATE SCHEMA wdm;
SET SEARCH_PATH TO wdm;

-- USERS
CREATE TABLE client
(
    name     VARCHAR(50),
    "userId" SERIAL primary key,
    credit   FLOAT DEFAULT 0
);

-- STOCK
CREATE TABLE item
(
    "itemId" SERIAL primary key,
    name     VARCHAR(50),
    price     FLOAT   NOT NULL,
    stock    INTEGER NOT NULL

);

-- ORDERS
CREATE TABLE "order"
(
    "orderId" SERIAL primary key,
    "userId"  INTEGER,
    status    VARCHAR(40)
);

-- ORDERS
CREATE TABLE order_item
(
    "orderId" INTEGER REFERENCES "order" ("orderId"),
    "itemId"  INTEGER,
    quantity  INTEGER NOT NULL,
    UNIQUE ("orderId", "itemId")

);

-- PAYMENTS
CREATE TABLE payment
(
    "paymentId" SERIAL primary key,
    cost        FLOAT NOT NULL,
    "orderId"   INTEGER,
    "userId"    INTEGER,
    UNIQUE ("orderId", "userId")
);
