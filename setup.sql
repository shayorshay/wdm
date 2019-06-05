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
    id SERIAL primary key,
    userid INTEGER REFERENCES client(id),
    
);

-- ORDERS
CREATE TABLE order_item
(
    order_id INTEGER REFERENCES "order" (id),
	item_id  INTEGER REFERENCES item (id),
    quantity INTEGER NOT NULL,
	cost  FLOAT DEFAULT 1

);

-- PAYMENTS
CREATE TABLE payment
(
    id INTEGER REFERENCES "order" (id),
    cost FLOAT NOT NULL,
    order_id VARCHAR(40),
	user_id VARCHAR(40),
	status VARCHAR(40)
);
