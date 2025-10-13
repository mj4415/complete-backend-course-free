# Module 5: API Development

## 🎯 Learning Objectives

By the end of this module, you will understand:
- Advanced RESTful API design patterns
- API versioning strategies
- Comprehensive error handling
- Input validation and sanitization
- API documentation best practices
- API testing methodologies
- Performance optimization
- Rate limiting and throttling

## 📚 Table of Contents

1. [RESTful API Design Principles](#1-restful-api-design-principles)
2. [API Versioning](#2-api-versioning)
3. [Error Handling](#3-error-handling)
4. [Input Validation](#4-input-validation)
5. [API Documentation](#5-api-documentation)
6. [API Testing](#6-api-testing)
7. [Performance Optimization](#7-performance-optimization)
8. [Rate Limiting](#8-rate-limiting)

---

## 1. RESTful API Design Principles

### Resource-Based URLs

```javascript
// Good: Resource-based URLs
GET    /api/v1/users                    // Get all users
GET    /api/v1/users/123               // Get specific user
POST   /api/v1/users                   // Create user
PUT    /api/v1/users/123               // Update entire user
PATCH  /api/v1/users/123               // Partial update user
DELETE /api/v1/users/123               // Delete user

// Nested resources
GET    /api/v1/users/123/posts         // Get posts by user 123
POST   /api/v1/users/123/posts         // Create post for user 123
GET    /api/v1/posts/456/comments      // Get comments for post 456

// Bad: Action-based URLs (avoid these)
GET    /api/getUsers
POST   /api/createUser
POST   /api/deleteUser
```

### HTTP Methods and Status Codes

```javascript
const express = require('express');
const router = express.Router();

// GET - Retrieve resources
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve users'
    });
  }
});

// POST - Create new resource
router.post('/users', async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: { user: newUser }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'User already exists'
      });
    }
    res.status(400).json({
      status: 'error',
      message: 'Invalid user data',
      errors: error.errors
    });
  }
});

// PUT - Replace entire resource
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true, overwrite: true }
    );
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: 'Update failed',
      errors: error.errors
    });
  }
});

// PATCH - Partial update
router.patch('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User updated successfully', 
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: 'Update failed'
    });
  }
});

// DELETE - Remove resource
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Delete failed'
    });
  }
});
```

### Query Parameters and Filtering

```javascript
// Advanced filtering, sorting, and pagination
router.get('/users', async (req, res) => {
  try {
    // Build query object
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(field => delete queryObj[field]);
    
    // Advanced filtering (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = User.find(JSON.parse(queryStr));
    
    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-password -__v');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query
    const users = await query;
    const total = await User.countDocuments(JSON.parse(queryStr));
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve users'
    });
  }
});

// Usage examples:
// GET /api/users?age[gte]=18&age[lt]=65
// GET /api/users?sort=-createdAt,name
// GET /api/users?fields=name,email,createdAt
// GET /api/users?page=2&limit=5
// GET /api/users?name[regex]=john&role=admin
```

---

## 2. API Versioning

### URL Path Versioning

```javascript
// Version 1 API
app.use('/api/v1', v1Routes);

// Version 2 API
app.use('/api/v2', v2Routes);

// Version-specific implementations
// v1/users.js
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({
    id: user._id,
    name: user.name,
    email: user.email
  });
});

// v2/users.js (with additional fields)
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({
    id: user._id,
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`
    },
    contact: {
      email: user.email,
      phone: user.phone
    },
    metadata: {
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }
  });
});
```

### Header-Based Versioning

```javascript
const versionMiddleware = (req, res, next) => {
  const version = req.headers['api-version'] || '1.0';
  req.apiVersion = version;
  next();
};

router.get('/users/:id', versionMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (req.apiVersion === '2.0') {
    // Return v2 format
    return res.json({
      user: {
        id: user._id,
        profile: { /* v2 structure */ },
        contact: { /* v2 structure */ }
      }
    });
  }
  
  // Default to v1 format
  res.json({
    id: user._id,
    name: user.name,
    email: user.email
  });
});
```

---

## 3. Error Handling

### Centralized Error Handling

```javascript
// Custom error class
class APIError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  console.error(err);
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new APIError(message, 404, 'RESOURCE_NOT_FOUND');
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new APIError(message, 409, 'DUPLICATE_FIELD');
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    error = new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    error.details = errors;
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new APIError('Invalid token', 401, 'INVALID_TOKEN');
  }
  
  if (err.name === 'TokenExpiredError') {
    error = new APIError('Token expired', 401, 'TOKEN_EXPIRED');
  }
  
  res.status(error.statusCode || 500).json({
    status: 'error',
    error: {
      message: error.message,
      code: error.errorCode,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.get('/users/:id', asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new APIError('User not found', 404, 'USER_NOT_FOUND'));
  }
  
  res.status(200).json({
    status: 'success',
    data: { user }
  });
}));
```

---

## 4. Input Validation

### Joi Validation

```javascript
const Joi = require('joi');

// Validation schemas
const schemas = {
  createUser: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
    age: Joi.number().integer().min(13).max(120),
    role: Joi.string().valid('user', 'admin', 'moderator').default('user')
  }),
  
  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    age: Joi.number().integer().min(13).max(120),
    bio: Joi.string().max(500)
  }),
  
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string(),
    fields: Joi.string(),
    search: Joi.string().max(100)
  })
};

// Validation middleware
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    req[source] = value; // Use validated/sanitized data
    next();
  };
};

// Usage
router.post('/users', 
  validate(schemas.createUser),
  async (req, res) => {
    // req.body now contains validated data
    const user = await User.create(req.body);
    res.status(201).json({ status: 'success', data: { user } });
  }
);

router.get('/users',
  validate(schemas.queryParams, 'query'),
  async (req, res) => {
    // req.query now contains validated query parameters
    const users = await User.find().limit(req.query.limit);
    res.json({ status: 'success', data: { users } });
  }
);
```

### Express Validator

```javascript
const { body, param, query, validationResult } = require('express-validator');

// Validation rules
const userValidationRules = () => {
  return [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
    body('firstName').trim().isLength({ min: 2, max: 50 }),
    body('lastName').trim().isLength({ min: 2, max: 50 }),
    body('age').optional().isInt({ min: 13, max: 120 })
  ];
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Usage
router.post('/users', userValidationRules(), validate, async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ status: 'success', data: { user } });
});
```

---

## 5. API Documentation

### OpenAPI/Swagger Documentation

```javascript
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management API',
      version: '1.0.0',
      description: 'A comprehensive user management API',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com/v1', 
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier'
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John'
            },
            lastName: {
              type: 'string', 
              description: 'User last name',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'User role'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'Something went wrong'
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js'] // Path to API files
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users with pagination
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering users
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName 
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users', createUser);
```

---

## 6. API Testing

### Unit Testing with Jest

```javascript
// __tests__/users.test.js
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Users API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  describe('POST /api/users', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined();
    });
    
    it('should return 400 for invalid email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
    });
    
    it('should return 409 for duplicate email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!'
      };
      
      // Create first user
      await User.create(userData);
      
      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(409);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('GET /api/users', () => {
    beforeEach(async () => {
      await User.create([
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
      ]);
    });
    
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.users).toHaveLength(2);
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=1')
        .expect(200);
      
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });
  
  describe('Authentication', () => {
    let authToken;
    
    beforeEach(async () => {
      const user = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'SecurePass123!',
        role: 'admin'
      });
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123!'
        });
      
      authToken = loginResponse.body.accessToken;
    });
    
    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
    
    it('should reject request without token', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });
  });
});
```

### Integration Testing

```javascript
// __tests__/integration/user-workflow.test.js
describe('User Workflow Integration', () => {
  it('should complete full user lifecycle', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!'
      })
      .expect(201);
    
    expect(registerResponse.body.status).toBe('success');
    
    // 2. Login user
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'SecurePass123!'
      })
      .expect(200);
    
    const token = loginResponse.body.accessToken;
    expect(token).toBeDefined();
    
    // 3. Get user profile
    const profileResponse = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(profileResponse.body.data.user.email).toBe('john@example.com');
    
    // 4. Update profile
    const updateResponse = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Johnny' })
      .expect(200);
    
    expect(updateResponse.body.data.user.firstName).toBe('Johnny');
    
    // 5. Delete account
    await request(app)
      .delete('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
```

---

## 7. Performance Optimization

### Database Query Optimization

```javascript
// Efficient pagination with cursor-based approach
router.get('/users', async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    
    let query = User.find();
    
    // Cursor-based pagination (more efficient for large datasets)
    if (cursor) {
      query = query.where('_id').gt(cursor);
    }
    
    const users = await query
      .limit(parseInt(limit) + 1) // Get one extra to check if there's a next page
      .sort({ _id: 1 })
      .select('-password');
    
    const hasNextPage = users.length > limit;
    if (hasNextPage) {
      users.pop(); // Remove the extra user
    }
    
    const nextCursor = hasNextPage ? users[users.length - 1]._id : null;
    
    res.json({
      status: 'success',
      data: { users },
      pagination: {
        nextCursor,
        hasNextPage,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Query failed' });
  }
});

// Aggregation pipeline optimization
router.get('/users/stats', async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          avgAge: { $avg: '$age' },
          totalLoginTime: { $sum: '$totalLoginTime' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({ status: 'success', data: { stats } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Stats query failed' });
  }
});
```

### Caching with Redis

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    try {
      const key = `cache:${req.originalUrl}`;
      const cached = await client.get(key);
      
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        client.setex(key, duration, JSON.stringify(data));
        originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      next(); // Continue without caching if Redis is down
    }
  };
};

// Usage
router.get('/users', cache(300), getAllUsers); // Cache for 5 minutes

// Cache invalidation
const invalidateCache = async (pattern) => {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Cache invalidation failed:', error);
  }
};

// Invalidate cache on data changes
router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  await invalidateCache('cache:/api/users*');
  res.status(201).json({ status: 'success', data: { user } });
});
```

---

## 8. Rate Limiting

### Express Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient();

// Different rate limits for different endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  }
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Custom rate limiting based on user role
const roleBasedLimiter = (req, res, next) => {
  const user = req.user;
  
  let maxRequests;
  switch (user.role) {
    case 'admin':
      maxRequests = 1000;
      break;
    case 'premium':
      maxRequests = 500;
      break;
    default:
      maxRequests = 100;
  }
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => `${req.user.id}:${req.ip}`
  });
  
  limiter(req, res, next);
};
```

---

## 📋 Module 5 Assignment

Build a comprehensive REST API for a blogging platform:

### Requirements

1. **API Design**
   - Complete REST API for posts, comments, categories
   - Proper HTTP methods and status codes
   - Resource-based URLs
   - Nested resource endpoints

2. **Documentation**
   - OpenAPI/Swagger documentation
   - Interactive API explorer
   - Request/response examples
   - Authentication documentation

3. **Validation & Error Handling**
   - Comprehensive input validation
   - Centralized error handling
   - Custom error types
   - Detailed error responses

4. **Testing**
   - Unit tests for all endpoints
   - Integration tests
   - Authentication tests
   - Error scenario tests

5. **Performance**
   - Pagination implementation
   - Caching strategy
   - Query optimization
   - Response compression

6. **Security**
   - Rate limiting
   - Input sanitization
   - CORS configuration
   - Security headers

### Deliverables

- Complete REST API implementation
- Swagger documentation
- Test suite with >90% coverage
- Performance optimization report
- Security implementation
- Postman collection

---

## 🎯 Key Takeaways

- Follow REST conventions for predictable APIs
- Document everything for better developer experience
- Validate all inputs and handle errors gracefully
- Test thoroughly at multiple levels
- Optimize for performance early
- Implement security measures from the start
- Use caching strategically
- Monitor and limit API usage

---

## 📖 Additional Resources

### Documentation
- [REST API Tutorial](https://restfulapi.net/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [HTTP Status Codes](https://httpstatuses.com/)

### Tools
- [Swagger Editor](https://editor.swagger.io/)
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [Artillery](https://artillery.io/) - Load testing

---

## ➡️ Next Steps

Ready for Module 6? Let's explore advanced backend topics:
- [Module 6: Advanced Topics](../06-advanced-topics/)

---

*Great APIs are the foundation of great applications! 🚀*