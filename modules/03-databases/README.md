# Module 3: Databases & Data Management

## 🎯 Learning Objectives

By the end of this module, you will understand:
- Fundamental database concepts and types
- SQL basics for relational databases
- NoSQL databases and their use cases
- Database design and modeling principles
- CRUD operations and data relationships
- Database security best practices
- Performance optimization techniques

## 📚 Table of Contents

1. [Database Fundamentals](#1-database-fundamentals)
2. [Relational Databases and SQL](#2-relational-databases-and-sql)
3. [PostgreSQL Deep Dive](#3-postgresql-deep-dive)
4. [NoSQL Databases](#4-nosql-databases)
5. [MongoDB Implementation](#5-mongodb-implementation)
6. [Database Design Principles](#6-database-design-principles)
7. [Database Security](#7-database-security)
8. [Performance Optimization](#8-performance-optimization)

---

## 1. Database Fundamentals

### What is a Database?

A database is an organized collection of structured information stored electronically in a computer system. It's managed by a Database Management System (DBMS).

### Types of Databases

#### Relational Databases (SQL)
- **Structure**: Tables with rows and columns
- **Relationships**: Foreign keys connect related data
- **ACID Properties**: Atomicity, Consistency, Isolation, Durability
- **Examples**: PostgreSQL, MySQL, SQLite, SQL Server
- **Best For**: Complex queries, transactions, data integrity

#### NoSQL Databases
- **Document**: MongoDB, CouchDB
- **Key-Value**: Redis, DynamoDB
- **Column-Family**: Cassandra, HBase
- **Graph**: Neo4j, Amazon Neptune
- **Best For**: Flexible schema, horizontal scaling, rapid development

### ACID vs BASE

#### ACID (Relational)
- **Atomicity**: All or nothing transactions
- **Consistency**: Data integrity rules enforced
- **Isolation**: Concurrent operations don't interfere
- **Durability**: Committed data survives system failures

#### BASE (NoSQL)
- **Basically Available**: System remains operational
- **Soft State**: Data may change over time
- **Eventually Consistent**: System becomes consistent over time

---

## 2. Relational Databases and SQL

### SQL Basics

#### Data Definition Language (DDL)
```sql
-- Create database
CREATE DATABASE ecommerce_db;

-- Use database
\c ecommerce_db;

-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);
```

#### Data Manipulation Language (DML)
```sql
-- Insert data
INSERT INTO categories (name, description) VALUES 
    ('Electronics', 'Electronic devices and gadgets'),
    ('Books', 'Physical and digital books'),
    ('Clothing', 'Apparel and accessories');

INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
    ('john_doe', 'john@example.com', 'hashed_password_1', 'John', 'Doe'),
    ('jane_smith', 'jane@example.com', 'hashed_password_2', 'Jane', 'Smith');

INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES
    ('Laptop Pro', 'High-performance laptop', 1299.99, 1, 50),
    ('Smartphone X', 'Latest smartphone model', 899.99, 1, 100),
    ('Programming Book', 'Learn backend development', 49.99, 2, 200);

-- Update data
UPDATE products 
SET price = 1199.99, updated_at = CURRENT_TIMESTAMP 
WHERE id = 1;

-- Delete data
DELETE FROM products WHERE stock_quantity = 0;
```

#### Data Query Language (DQL)
```sql
-- Basic SELECT
SELECT * FROM products;
SELECT name, price FROM products WHERE category_id = 1;

-- Joins
SELECT p.name, p.price, c.name as category_name
FROM products p
INNER JOIN categories c ON p.category_id = c.id;

-- Aggregations
SELECT 
    c.name as category,
    COUNT(p.id) as product_count,
    AVG(p.price) as avg_price,
    SUM(p.stock_quantity) as total_stock
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name
ORDER BY product_count DESC;

-- Complex queries with subqueries
SELECT u.username, u.email,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
    (SELECT SUM(total_amount) FROM orders WHERE user_id = u.id) as total_spent
FROM users u
WHERE u.created_at >= '2024-01-01';

-- Window functions
SELECT 
    name,
    price,
    category_id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) as price_rank
FROM products;
```

---

## 3. PostgreSQL Deep Dive

### Advanced PostgreSQL Features

#### JSON Support
```sql
-- Add JSON column
ALTER TABLE products ADD COLUMN attributes JSONB;

-- Insert JSON data
UPDATE products 
SET attributes = '{
    "color": "black",
    "weight": "1.5kg",
    "dimensions": {
        "width": 30,
        "height": 20,
        "depth": 2
    },
    "features": ["wireless", "bluetooth", "touchscreen"]
}'
WHERE id = 1;

-- Query JSON data
SELECT name, attributes->>'color' as color
FROM products 
WHERE attributes ? 'color';

SELECT name, jsonb_array_elements_text(attributes->'features') as feature
FROM products
WHERE attributes ? 'features';
```

#### Indexes
```sql
-- B-tree index (default)
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);

-- Composite index
CREATE INDEX idx_products_category_price ON products(category_id, price);

-- Partial index
CREATE INDEX idx_active_products ON products(name) WHERE stock_quantity > 0;

-- GIN index for JSON
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Full-text search index
ALTER TABLE products ADD COLUMN search_vector tsvector;
UPDATE products SET search_vector = to_tsvector('english', name || ' ' || COALESCE(description, ''));
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
```

#### Constraints and Triggers
```sql
-- Check constraints
ALTER TABLE products ADD CONSTRAINT check_positive_price CHECK (price > 0);
ALTER TABLE products ADD CONSTRAINT check_non_negative_stock CHECK (stock_quantity >= 0);

-- Create audit table
CREATE TABLE product_audit (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    action VARCHAR(10),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_product_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO product_audit (product_id, action, new_values)
        VALUES (NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO product_audit (product_id, action, old_values, new_values)
        VALUES (NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO product_audit (product_id, action, old_values)
        VALUES (OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_product_changes();
```

---

## 4. NoSQL Databases

### Document Databases (MongoDB)

#### Document Structure
```javascript
// User document
{
  _id: ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
  username: "john_doe",
  email: "john@example.com",
  profile: {
    firstName: "John",
    lastName: "Doe",
    age: 30,
    address: {
      street: "123 Main St",
      city: "New York",
      country: "USA"
    }
  },
  preferences: ["electronics", "books"],
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
}

// Product document
{
  _id: ObjectId("65f1a2b3c4d5e6f7a8b9c0d2"),
  name: "Laptop Pro",
  description: "High-performance laptop",
  price: 1299.99,
  category: "electronics",
  specifications: {
    processor: "Intel i7",
    memory: "16GB RAM",
    storage: "512GB SSD",
    display: "15.6 inch 4K"
  },
  tags: ["laptop", "computer", "portable"],
  reviews: [
    {
      userId: ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
      rating: 5,
      comment: "Excellent laptop!",
      date: ISODate("2024-01-15T00:00:00Z")
    }
  ],
  stockQuantity: 50,
  createdAt: ISODate("2024-01-01T00:00:00Z")
}
```

### Key-Value Stores (Redis)

#### Redis Data Types
```javascript
// Strings
SET user:1001:name "John Doe"
GET user:1001:name
SETEX session:abc123 3600 "user_data" // Expire in 1 hour

// Hashes
HMSET user:1001 name "John Doe" email "john@example.com" age 30
HGET user:1001 name
HGETALL user:1001

// Lists
LPUSH recent_activities "user_login:1001"
LPUSH recent_activities "product_view:2001"
LRANGE recent_activities 0 9 // Get last 10 activities

// Sets
SADD user:1001:interests "programming" "technology" "books"
SMEMBERS user:1001:interests
SINTER user:1001:interests user:1002:interests // Common interests

// Sorted Sets (Leaderboard)
ZADD leaderboard 1500 "player1"
ZADD leaderboard 1200 "player2"
ZREVRANGE leaderboard 0 9 WITHSCORES // Top 10 with scores
```

---

## 5. MongoDB Implementation

### MongoDB with Node.js (Mongoose)

#### Schema Definition
```javascript
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    firstName: String,
    lastName: String,
    age: {
      type: Number,
      min: 13,
      max: 120
    },
    avatar: String
  },
  preferences: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const bcrypt = require('bcryptjs');
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

const User = mongoose.model('User', userSchema);

// Product Schema with references
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  specifications: {
    type: Map,
    of: String
  },
  tags: [String],
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound index
productSchema.index({ category: 1, price: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
```

#### CRUD Operations
```javascript
// Create
const createUser = async (userData) => {
  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
};

// Read
const getUsers = async (page = 1, limit = 10, search = '') => {
  const skip = (page - 1) * limit;
  const query = search ? {
    $or: [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  } : {};
  
  const users = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
    
  const total = await User.countDocuments(query);
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Update
const updateUser = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

// Delete
const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// Complex aggregations
const getUserStats = async () => {
  const stats = await User.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        avgAge: { $avg: '$profile.age' },
        oldestUser: { $max: '$profile.age' },
        youngestUser: { $min: '$profile.age' }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        avgAge: { $round: ['$avgAge', 2] },
        oldestUser: 1,
        youngestUser: 1
      }
    }
  ]);
  
  return stats[0] || {};
};
```

---

## 6. Database Design Principles

### Normalization (SQL)

#### First Normal Form (1NF)
- Each column contains atomic values
- No repeating groups

```sql
-- Bad (not 1NF)
CREATE TABLE users_bad (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    phones VARCHAR(200) -- "123-456-7890, 987-654-3210"
);

-- Good (1NF)
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE user_phones (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    phone VARCHAR(20)
);
```

#### Second Normal Form (2NF)
- Must be in 1NF
- No partial dependencies on composite primary keys

```sql
-- Bad (not 2NF)
CREATE TABLE order_items_bad (
    order_id INT,
    product_id INT,
    quantity INT,
    product_name VARCHAR(200), -- Depends only on product_id
    product_price DECIMAL(10,2), -- Depends only on product_id
    PRIMARY KEY (order_id, product_id)
);

-- Good (2NF)
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10,2), -- Price at time of order
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200),
    price DECIMAL(10,2)
);
```

#### Third Normal Form (3NF)
- Must be in 2NF
- No transitive dependencies

### Denormalization for Performance

```sql
-- Sometimes denormalization improves performance
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(100), -- Denormalized for faster queries
    user_email VARCHAR(100), -- Denormalized
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP
);
```

### Schema Design for MongoDB

#### Embedding vs Referencing

```javascript
// Embedding (for small, related data)
const blogPostSchema = {
  title: String,
  content: String,
  author: {
    name: String,
    email: String
  },
  comments: [{
    text: String,
    author: String,
    createdAt: Date
  }]
};

// Referencing (for large or frequently updated data)
const userSchema = {
  _id: ObjectId,
  username: String,
  email: String
};

const postSchema = {
  title: String,
  content: String,
  authorId: { type: ObjectId, ref: 'User' },
  comments: [{ type: ObjectId, ref: 'Comment' }]
};
```

---

## 7. Database Security

### Authentication and Authorization

```sql
-- PostgreSQL user management
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
CREATE ROLE read_only_user WITH LOGIN PASSWORD 'readonly_pass';

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO app_user;
GRANT SELECT ON products TO read_only_user;

-- Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_data_policy ON user_data
    FOR ALL TO app_user
    USING (user_id = current_setting('app.current_user_id')::INT);
```

### Data Encryption

```sql
-- Column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted data
INSERT INTO users (email, encrypted_ssn) VALUES 
    ('user@example.com', crypt('123-45-6789', gen_salt('bf')));

-- Query encrypted data
SELECT * FROM users 
WHERE encrypted_ssn = crypt('123-45-6789', encrypted_ssn);
```

### SQL Injection Prevention

```javascript
// Bad - Vulnerable to SQL injection
const getUserByEmail = (email) => {
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  return db.query(query);
};

// Good - Using parameterized queries
const getUserByEmail = (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  return db.query(query, [email]);
};

// Using ORM (even safer)
const getUserByEmail = (email) => {
  return User.findOne({ email });
};
```

---

## 8. Performance Optimization

### Indexing Strategies

```sql
-- Query analysis
EXPLAIN ANALYZE SELECT * FROM products 
WHERE category_id = 1 AND price > 100;

-- Create appropriate indexes
CREATE INDEX idx_products_category_price ON products(category_id, price);

-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Query Optimization

```sql
-- Use LIMIT for large result sets
SELECT * FROM products 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;

-- Avoid SELECT *
SELECT id, name, price FROM products;

-- Use EXISTS instead of IN for subqueries
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- Batch operations
INSERT INTO products (name, price, category_id) VALUES
    ('Product 1', 19.99, 1),
    ('Product 2', 29.99, 1),
    ('Product 3', 39.99, 2);
```

### Connection Pooling

```javascript
// PostgreSQL with pg-pool
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'dbuser',
  password: 'dbpass',
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// MongoDB connection pooling
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/myapp', {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0 // Disable mongoose buffering
});
```

---

## 📋 Module 3 Assignment

Build a comprehensive data layer for an e-commerce application:

### Database Design Task

1. **Choose Your Database**: PostgreSQL OR MongoDB
2. **Design Schema**: Create complete data model
3. **Implement CRUD**: Full CRUD operations for all entities
4. **Add Relationships**: Properly relate entities
5. **Optimize Performance**: Add indexes and optimize queries
6. **Implement Security**: Add authentication and data validation

### Required Entities

#### For SQL (PostgreSQL)
- Users (customers)
- Categories  
- Products
- Orders
- Order Items
- Reviews
- Shopping Carts
- Addresses

#### For NoSQL (MongoDB)
- Users (embedded addresses)
- Products (embedded reviews and specifications)
- Categories
- Orders (embedded order items)
- Shopping Carts

### Technical Requirements

1. **Data Validation**: Implement comprehensive validation
2. **Indexes**: Create appropriate indexes for performance
3. **Relationships**: Properly implement relationships/references
4. **Seed Data**: Create realistic test data
5. **Queries**: Implement complex queries (joins, aggregations)
6. **Performance**: Optimize for common use cases

### Deliverables

- Complete database schema/model files
- CRUD operation implementations
- Complex query examples
- Performance optimization report
- Security implementation
- Test data and queries

---

## 🎯 Key Takeaways

- Choose the right database type for your use case
- Proper database design is crucial for performance and maintainability
- Indexes significantly improve query performance but impact write operations
- Security should be built into the database layer from the start
- NoSQL offers flexibility but requires different design thinking
- SQL provides strong consistency and complex query capabilities

---

## 📖 Additional Resources

### Books
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "MongoDB: The Definitive Guide" by Kristina Chodorow
- "PostgreSQL: Up and Running" by Regina Obe

### Online Resources
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [SQL Tutorial](https://www.w3schools.com/sql/)
- [Database Design Course](https://www.coursera.org/learn/database-design)

### Tools
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL administration
- [MongoDB Compass](https://www.mongodb.com/products/compass) - MongoDB GUI
- [DBeaver](https://dbeaver.io/) - Universal database tool

---

## ➡️ Next Steps

Ready for Module 4? Let's secure our applications with authentication:
- [Module 4: Authentication & Security](../04-authentication/)

---

*Data is the foundation of every great application! 💾*