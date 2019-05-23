DROP SCHEMA wdm CASCADE;
CREATE SCHEMA wdm;
SET SEARCH_PATH TO wdm;

-- USERS
CREATE TABLE client
(
    name   VARCHAR(50),
    id     SERIAL primary key,
--     id     VARCHAR(40) primary key,
    credit FLOAT DEFAULT 0
);

-- STOCK
CREATE TABLE item
(
    id    SERIAL primary key,
--     id    VARCHAR(40) primary key,
    name  VARCHAR(50),
    cost  FLOAT   NOT NULL,
    stock INTEGER NOT NULL

);

-- ORDERS
CREATE TABLE "order"
(
    id SERIAL primary key
--     id VARCHAR(40) primary key
);

-- ORDERS
CREATE TABLE order_item
(
    order_id INTEGER REFERENCES "order" (id),
--     item_id  VARCHAR(40) REFERENCES item (id),
    item_id  VARCHAR(40),
    quantity INTEGER NOT NULL
);

-- PAYMENTS
CREATE TABLE payment
(
    id       SERIAL primary key,
--     id       VARCHAR(40) primary key,
    order_id VARCHAR(40)
);
