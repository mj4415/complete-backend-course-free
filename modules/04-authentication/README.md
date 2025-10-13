# Module 4: Authentication & Security

## 🎯 Learning Objectives

By the end of this module, you will understand:
- Authentication vs Authorization concepts
- JWT (JSON Web Tokens) implementation
- OAuth 2.0 and social login integration
- Password security and hashing
- Session management strategies
- Security best practices and common vulnerabilities
- Rate limiting and API protection

## 📚 Table of Contents

1. [Authentication Fundamentals](#1-authentication-fundamentals)
2. [JWT Implementation](#2-jwt-implementation)
3. [OAuth 2.0 and Social Login](#3-oauth-20-and-social-login)
4. [Password Security](#4-password-security)
5. [Session Management](#5-session-management)
6. [Authorization Patterns](#6-authorization-patterns)
7. [Security Best Practices](#7-security-best-practices)
8. [API Security](#8-api-security)

---

## 1. Authentication Fundamentals

### Authentication vs Authorization

| Aspect | Authentication | Authorization |
|--------|----------------|---------------|
| **Purpose** | "Who are you?" | "What can you do?" |
| **Process** | Verify identity | Check permissions |
| **Methods** | Password, biometrics, tokens | Roles, permissions, ACLs |
| **When** | At login | On each request |
| **Example** | Username/password | Admin can delete users |

### Authentication Methods

#### 1. Session-Based Authentication
```javascript
// Traditional session-based auth
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = await User.findOne({ username });
  if (!user || !await user.comparePassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Store user in session
  req.session.userId = user.id;
  res.json({ message: 'Login successful', user: user.toJSON() });
});

// Session middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
```

#### 2. Token-Based Authentication
```javascript
// JWT-based authentication
const jwt = require('jsonwebtoken');

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = await User.findOne({ username });
  if (!user || !await user.comparePassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ 
    message: 'Login successful', 
    token,
    user: user.toJSON() 
  });
});
```

---

## 2. JWT Implementation

### Understanding JWTs

JWT structure: `header.payload.signature`

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "userId": "12345",
  "username": "john_doe",
  "role": "user",
  "iat": 1640995200,
  "exp": 1641081600
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

### Complete JWT Authentication System

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  // Generate JWT token
  static generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'your-app-name'
    });
  }
  
  // Generate refresh token
  static generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }
  
  // Verify token
  static verifyToken(token, secret = process.env.JWT_SECRET) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
  
  // Decode token without verification (for debugging)
  static decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }
    
    const decoded = AuthService.verifyToken(token);
    
    // Optional: Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }
    
    req.user = decoded;
    req.fullUser = user;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: error.message,
      code: 'TOKEN_INVALID'
    });
  }
};

// Login endpoint with refresh token
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }]
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Generate tokens
    const accessToken = AuthService.generateToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }
    
    const decoded = AuthService.verifyToken(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET
    );
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const newAccessToken = AuthService.generateToken(user);
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ 
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});
```

---

## 3. OAuth 2.0 and Social Login

### OAuth 2.0 Flow

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      googleId: profile.id,
      username: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value,
      provider: 'google'
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// GitHub OAuth strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    user = new User({
      githubId: profile.id,
      username: profile.username,
      email: profile.emails ? profile.emails[0].value : null,
      avatar: profile.photos[0].value,
      provider: 'github'
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = AuthService.generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { session: false }),
  (req, res) => {
    const token = AuthService.generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);
```

---

## 4. Password Security

### Password Hashing with bcrypt

```javascript
const bcrypt = require('bcryptjs');

class PasswordService {
  // Hash password
  static async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  // Verify password
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
  
  // Generate secure random password
  static generateRandomPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
  
  // Validate password strength
  static validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Password reset functionality
const crypto = require('crypto');

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ 
        message: 'If an account with that email exists, we\'ve sent a reset link.' 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Save to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    
    // Send email (implement email service)
    await sendPasswordResetEmail(user.email, resetToken);
    
    res.json({ 
      message: 'If an account with that email exists, we\'ve sent a reset link.' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    
    // Validate password
    const validation = PasswordService.validatePassword(password);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid password',
        details: validation.errors
      });
    }
    
    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        error: 'Token is invalid or has expired' 
      });
    }
    
    // Update password
    user.password = await PasswordService.hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 5. Session Management

### Express Session Configuration

```javascript
const session = require('express-session');
const MongoStore = require('connect-mongo');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);

// Redis session store (recommended for production)
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'sessionId' // Don't use default name
}));

// MongoDB session store (alternative)
app.use(session({
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

---

## 6. Authorization Patterns

### Role-Based Access Control (RBAC)

```javascript
// User model with roles
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  roles: [{
    type: String,
    enum: ['user', 'moderator', 'admin', 'super_admin'],
    default: 'user'
  }],
  permissions: [{
    resource: String, // 'users', 'posts', 'comments'
    actions: [String] // ['create', 'read', 'update', 'delete']
  }]
});

// Authorization middleware
const authorize = (requiredRoles = [], requiredPermissions = []) => {
  return (req, res, next) => {
    const user = req.user;
    
    // Check roles
    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some(role => user.roles.includes(role));
      if (!hasRole) {
        return res.status(403).json({ 
          error: 'Insufficient permissions - role required',
          required: requiredRoles
        });
      }
    }
    
    // Check specific permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return user.permissions.some(p => 
          p.resource === resource && p.actions.includes(action)
        );
      });
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions - specific permission required',
          required: requiredPermissions
        });
      }
    }
    
    next();
  };
};

// Usage examples
app.get('/api/admin/users', 
  authenticateToken, 
  authorize(['admin', 'super_admin']),
  getAllUsers
);

app.delete('/api/posts/:id', 
  authenticateToken,
  authorize([], ['posts:delete']),
  deletePost
);

// Resource-based authorization
const authorizeResourceOwner = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.userId;
      
      let resource;
      switch (resourceType) {
        case 'post':
          resource = await Post.findById(resourceId);
          break;
        case 'comment':
          resource = await Comment.findById(resourceId);
          break;
        default:
          return res.status(400).json({ error: 'Unknown resource type' });
      }
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user owns the resource or is admin
      const isOwner = resource.userId.toString() === userId;
      const isAdmin = req.user.roles.includes('admin');
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ 
          error: 'You can only modify your own resources' 
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};
```

---

## 7. Security Best Practices

### Input Validation and Sanitization

```javascript
const validator = require('validator');
const xss = require('xss');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Security middleware
app.use(helmet()); // Set various HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(express.json({ limit: '10mb' })); // Limit body size

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  }
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    req.body = value; // Use sanitized values
    next();
  };
};

// Joi validation schemas
const Joi = require('joi');

const registrationSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

// XSS protection
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
};

app.use(sanitizeInput);
```

---

## 8. API Security

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://yourapp.com',
      'https://www.yourapp.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### API Key Authentication

```javascript
const crypto = require('crypto');

// Generate API key
const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// API key middleware
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        code: 'API_KEY_MISSING'
      });
    }
    
    // Hash the API key for comparison
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    // Find API key in database
    const keyRecord = await ApiKey.findOne({ 
      keyHash: hashedKey,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('user');
    
    if (!keyRecord) {
      return res.status(401).json({ 
        error: 'Invalid or expired API key',
        code: 'API_KEY_INVALID'
      });
    }
    
    // Update last used
    keyRecord.lastUsedAt = new Date();
    keyRecord.usageCount += 1;
    await keyRecord.save();
    
    req.apiKey = keyRecord;
    req.user = keyRecord.user;
    next();
  } catch (error) {
    res.status(500).json({ 
      error: 'API key verification failed',
      code: 'SERVER_ERROR'
    });
  }
};
```

---

## 📋 Module 4 Assignment

Build a complete authentication and authorization system:

### Requirements

1. **User Registration & Login**
   - Email/username and password registration
   - Login with JWT token generation
   - Password strength validation
   - Email verification

2. **JWT Implementation**
   - Access tokens (short-lived)
   - Refresh tokens (long-lived)
   - Token refresh endpoint
   - Secure token storage

3. **Password Security**
   - Secure password hashing
   - Password reset functionality
   - Password change for authenticated users
   - Password history (prevent reuse)

4. **OAuth Integration**
   - Google OAuth login
   - Account linking (connect OAuth to existing account)

5. **Authorization System**
   - Role-based access control
   - Protected routes
   - Resource ownership validation

6. **Security Features**
   - Rate limiting
   - Input validation
   - XSS protection
   - CORS configuration

### Deliverables

- Complete authentication API
- JWT middleware implementation
- OAuth integration
- Role-based authorization system
- Security middleware
- Comprehensive API documentation
- Postman collection with test cases

---

## 🎯 Key Takeaways

- Authentication verifies identity; authorization controls access
- JWT provides stateless authentication suitable for APIs
- Always hash passwords with bcrypt or similar
- Implement proper session management
- Use HTTPS in production
- Validate and sanitize all inputs
- Implement rate limiting to prevent abuse
- Follow the principle of least privilege

---

## 📖 Additional Resources

### Documentation
- [JWT.io](https://jwt.io/) - JWT debugger and libraries
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)

### Libraries
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - JWT implementation
- [passport](http://www.passportjs.org/) - Authentication middleware
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) - Rate limiting

---

## ➡️ Next Steps

Ready for Module 5? Let's dive into professional API development:
- [Module 5: API Development](../05-api-development/)

---

*Security is not a feature, it's a foundation! 🔒*