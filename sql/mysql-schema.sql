CREATE DATABASE IF NOT EXISTS event_ticket_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE event_ticket_system;


CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,

  name VARCHAR(100) NOT NULL,

  email VARCHAR(255) NOT NULL,

  password_hash VARCHAR(255) NOT NULL,

  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',

  created_at DATETIME NOT NULL,

  updated_at DATETIME NOT NULL,

  PRIMARY KEY (id),

  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) NOT NULL,

  user_id CHAR(36) NOT NULL,

  event_id CHAR(24) NOT NULL,

  status ENUM(
    'pending',
    'confirmed',
    'failed',
    'cancelled'
  ) NOT NULL DEFAULT 'pending',

  failure_reason VARCHAR(255) NULL,

  booked_at DATETIME NOT NULL,

  created_at DATETIME NOT NULL,

  updated_at DATETIME NOT NULL,

  PRIMARY KEY (id),

  CONSTRAINT uq_bookings_user_event
    UNIQUE (user_id, event_id),

  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  INDEX idx_bookings_user_id (user_id),

  INDEX idx_bookings_event_id (event_id),

  INDEX idx_bookings_status_updated_at (
    status,
    updated_at
  )
) ENGINE=InnoDB;