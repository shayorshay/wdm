DROP SCHEMA wdm CASCADE;
CREATE SCHEMA wdm;
SET SEARCH_PATH TO wdm;

-- USERS
CREATE TABLE client
(
    name   VARCHAR(50),
    id     VARCHAR(40) primary key,
    credit FLOAT
);

-- STOCK
CREATE TABLE item
(
    id    VARCHAR(40) primary key,
    name  VARCHAR(50),
    cost  FLOAT,
    stock INTEGER

);

-- ORDERS
CREATE TABLE "order"
(
    id VARCHAR(40) primary key
);

-- ORDERS
CREATE TABLE order_item
(
    order_id VARCHAR(40) REFERENCES "order" (id),
--     item_id  VARCHAR(40) REFERENCES item (id),
    item_id  VARCHAR(40),
    quantity INTEGER
);

-- PAYMENTS
CREATE TABLE payment
(
    id       VARCHAR(40) primary key,
    order_id VARCHAR(40)
);
