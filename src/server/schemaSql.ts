export const VENDTRACK_MYSQL_DDL = `-- VendTrack: Physical Database Design (MySQL 8 / InnoDB)
-- Generated from VendTrack Relational Database Specification

CREATE DATABASE IF NOT EXISTS vendtrack_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE vendtrack_db;

CREATE TABLE LOCATION (
  location_id INT NOT NULL AUTO_INCREMENT,
  site_name VARCHAR(100) NOT NULL,
  address VARCHAR(150) NOT NULL,
  city VARCHAR(50) NOT NULL,
  contact_person VARCHAR(80),
  contact_no VARCHAR(15),
  PRIMARY KEY (location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MACHINE (
  machine_id INT NOT NULL AUTO_INCREMENT,
  location_id INT NOT NULL,
  serial_no VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(50) NOT NULL,
  machine_type ENUM('Snack','Beverage','Combo') NOT NULL,
  install_date DATE NOT NULL,
  machine_status ENUM('Active','Under Maintenance','Offline') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (machine_id),
  CONSTRAINT fk_machine_location FOREIGN KEY (location_id)
    REFERENCES LOCATION (location_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE CATEGORY (
  category_id INT NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(150),
  PRIMARY KEY (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SUPPLIER (
  supplier_id INT NOT NULL AUTO_INCREMENT,
  supplier_name VARCHAR(100) NOT NULL UNIQUE,
  contact_person VARCHAR(80),
  contact_no VARCHAR(15),
  email VARCHAR(100),
  address VARCHAR(150),
  PRIMARY KEY (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PRODUCT (
  product_id INT NOT NULL AUTO_INCREMENT,
  sku VARCHAR(12) NOT NULL UNIQUE,
  product_name VARCHAR(80) NOT NULL,
  category_id INT NOT NULL,
  supplier_id INT NOT NULL,
  unit_cost DECIMAL(8,2) NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id)
    REFERENCES CATEGORY (category_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_product_supplier FOREIGN KEY (supplier_id)
    REFERENCES SUPPLIER (supplier_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_product_cost CHECK (unit_cost >= 0),
  CONSTRAINT ck_product_price CHECK (unit_price >= unit_cost)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE EMPLOYEE (
  employee_id INT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  role ENUM('Route Driver','Technician','Manager','Administrator') NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  contact_no VARCHAR(15),
  date_hired DATE NOT NULL,
  PRIMARY KEY (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MACHINE_SLOT (
  machine_id INT NOT NULL,
  slot_no TINYINT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  max_capacity INT NOT NULL DEFAULT 10,
  PRIMARY KEY (machine_id, slot_no),
  CONSTRAINT fk_slot_machine FOREIGN KEY (machine_id)
    REFERENCES MACHINE (machine_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_slot_product FOREIGN KEY (product_id)
    REFERENCES PRODUCT (product_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_slot_quantity CHECK (quantity >= 0 AND quantity <= max_capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE RESTOCK (
  restock_id INT NOT NULL AUTO_INCREMENT,
  machine_id INT NOT NULL,
  employee_id INT NOT NULL,
  restock_date DATE NOT NULL,
  PRIMARY KEY (restock_id),
  CONSTRAINT fk_restock_machine FOREIGN KEY (machine_id)
    REFERENCES MACHINE (machine_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_restock_employee FOREIGN KEY (employee_id)
    REFERENCES EMPLOYEE (employee_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE RESTOCK_ITEM (
  restock_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_added INT NOT NULL,
  PRIMARY KEY (restock_id, product_id),
  CONSTRAINT fk_ritem_restock FOREIGN KEY (restock_id)
    REFERENCES RESTOCK (restock_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ritem_product FOREIGN KEY (product_id)
    REFERENCES PRODUCT (product_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_ritem_qty CHECK (quantity_added > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SALE (
  sale_id INT NOT NULL AUTO_INCREMENT,
  machine_id INT NOT NULL,
  sale_datetime DATETIME NOT NULL,
  payment_method ENUM('Cash','Coin','GCash','Card') NOT NULL,
  PRIMARY KEY (sale_id),
  CONSTRAINT fk_sale_machine FOREIGN KEY (machine_id)
    REFERENCES MACHINE (machine_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SALE_ITEM (
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price_at_sale DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (sale_id, product_id),
  CONSTRAINT fk_sitem_sale FOREIGN KEY (sale_id)
    REFERENCES SALE (sale_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sitem_product FOREIGN KEY (product_id)
    REFERENCES PRODUCT (product_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_sitem_qty CHECK (quantity > 0),
  CONSTRAINT ck_sitem_price CHECK (unit_price_at_sale >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MAINTENANCE (
  maintenance_id INT NOT NULL AUTO_INCREMENT,
  machine_id INT NOT NULL,
  employee_id INT NOT NULL,
  issue_description VARCHAR(150) NOT NULL,
  reported_date DATE NOT NULL,
  resolved_date DATE,
  maintenance_status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  repair_cost DECIMAL(8,2),
  PRIMARY KEY (maintenance_id),
  CONSTRAINT fk_maint_machine FOREIGN KEY (machine_id)
    REFERENCES MACHINE (machine_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_maint_employee FOREIGN KEY (employee_id)
    REFERENCES EMPLOYEE (employee_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_maint_dates CHECK (resolved_date >= reported_date),
  CONSTRAINT ck_maint_cost CHECK (repair_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_sale_datetime ON SALE (sale_datetime);
CREATE INDEX idx_product_name ON PRODUCT (product_name);
CREATE INDEX idx_machine_status ON MACHINE (machine_status);
CREATE INDEX idx_maint_status ON MAINTENANCE (maintenance_status);
CREATE INDEX idx_slot_quantity ON MACHINE_SLOT (quantity);
`;
