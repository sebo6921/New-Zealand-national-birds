-- create user


-- create database
DROP TABLE IF EXISTS Photos;

DROP TABLE IF EXISTS Bird;

DROP TABLE IF EXISTS ConservationStatus;
DROP DATABASE ASGN2;

CREATE DATABASE ASGN2;
USE ASGN2;

-- create tables
CREATE TABLE ConservationStatus (
    status_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(255) NOT NULL,
    status_colour CHAR(7) NOT NULL
);

CREATE TABLE Bird (
    bird_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    primary_name VARCHAR(255) NOT NULL,
    english_name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255) NOT NULL,
    order_name VARCHAR(255) NOT NULL,
    family VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    status_id INT,
    FOREIGN KEY (status_id) REFERENCES ConservationStatus(status_id) ON DELETE SET NULL
);

CREATE TABLE Photos (
    photo_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bird_id INT,
    filename VARCHAR(255) NOT NULL,
    photographer VARCHAR(255) NOT NULL,
    FOREIGN KEY (bird_id) REFERENCES Bird(bird_id) ON DELETE CASCADE
);  