# Module 2: Programming Languages & Frameworks

## 🎯 Learning Objectives

By the end of this module, you will understand:
- JavaScript fundamentals for backend development
- Node.js runtime environment and ecosystem
- Express.js framework for building APIs
- Python backend development with Flask/Django
- Framework comparison and selection criteria
- Building your first complete API

## 📚 Table of Contents

1. [JavaScript for Backend Development](#1-javascript-for-backend-development)
2. [Node.js Runtime Environment](#2-nodejs-runtime-environment)
3. [Express.js Framework](#3-expressjs-framework)
4. [Python for Backend Development](#4-python-for-backend-development)
5. [Flask Framework](#5-flask-framework)
6. [Django Introduction](#6-django-introduction)
7. [Framework Comparison](#7-framework-comparison)

---

## 1. JavaScript for Backend Development

### Modern JavaScript Features

#### ES6+ Syntax
```javascript
// Arrow Functions
const getUserById = (id) => {
  return users.find(user => user.id === id);
};

// Destructuring
const { name, email } = user;
const [first, second] = items;

// Template Literals
const message = `Welcome ${name}! You have ${count} messages.`;

// Async/Await
const fetchUserData = async (userId) => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user:', error);
  }
};
```

#### Promises and Async Programming
```javascript
// Promise Creation
const readFile = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

// Promise Chaining
readFile('config.json')
  .then(data => JSON.parse(data))
  .then(config => initializeApp(config))
  .catch(error => console.error('Setup failed:', error));

// Multiple Promises
const fetchAllData = async () => {
  try {
    const [users, posts, comments] = await Promise.all([
      fetchUsers(),
      fetchPosts(),
      fetchComments()
    ]);
    return { users, posts, comments };
  } catch (error) {
    throw new Error('Failed to fetch data');
  }
};
```

### Error Handling
```javascript
// Try-Catch with Async/Await
const processUserData = async (userData) => {
  try {
    const validatedData = validateUserData(userData);
    const savedUser = await saveToDatabase(validatedData);
    await sendWelcomeEmail(savedUser.email);
    return savedUser;
  } catch (validationError) {
    if (validationError.name === 'ValidationError') {
      throw new Error(`Invalid user data: ${validationError.message}`);
    }
    throw validationError;
  }
};

// Custom Error Classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
```

---

## 2. Node.js Runtime Environment

### Understanding Node.js

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine, designed for building scalable network applications.

#### Key Features:
- **Non-blocking I/O**: Handles multiple requests concurrently
- **Event-driven**: Uses events and callbacks for asynchronous operations
- **Single-threaded**: Main event loop runs on a single thread
- **Cross-platform**: Runs on Windows, macOS, and Linux

### Node.js Core Modules

#### File System (fs)
```javascript
const fs = require('fs').promises;

// Read file asynchronously
const readConfigFile = async () => {
  try {
    const data = await fs.readFile('config.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
};

// Write file
const saveUserData = async (userData) => {
  const dataString = JSON.stringify(userData, null, 2);
  await fs.writeFile('users.json', dataString);
};
```

#### HTTP Module
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/api/health') {
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'OK', timestamp: new Date() }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

#### Path Module
```javascript
const path = require('path');

// Join paths safely
const logFile = path.join(__dirname, 'logs', 'app.log');
const configPath = path.resolve('./config/database.json');

// Get file information
const filename = path.basename('/users/john/documents/report.pdf'); // 'report.pdf'
const extension = path.extname(filename); // '.pdf'
const directory = path.dirname('/users/john/documents/report.pdf'); // '/users/john/documents'
```

### NPM (Node Package Manager)

#### Package.json
```json
{
  "name": "my-backend-api",
  "version": "1.0.0",
  "description": "A comprehensive backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^6.3.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^8.5.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.15",
    "jest": "^28.0.0",
    "eslint": "^8.14.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

---

## 3. Express.js Framework

### Getting Started with Express

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Express API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### Routing in Express

#### Basic Routes
```javascript
// GET route
app.get('/api/users', (req, res) => {
  res.json({ users: getAllUsers() });
});

// POST route
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  // Validation
  if (!name || !email) {
    return res.status(400).json({ 
      error: 'Name and email are required' 
    });
  }

  const newUser = createUser({ name, email });
  res.status(201).json({ 
    message: 'User created successfully', 
    user: newUser 
  });
});

// Route parameters
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = getUserById(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
});

// Query parameters
app.get('/api/search', (req, res) => {
  const { q, limit = 10, page = 1 } = req.query;
  const results = searchUsers(q, parseInt(limit), parseInt(page));
  res.json({ results, query: q, page: parseInt(page) });
});
```

#### Router Module
```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

// Middleware specific to this router
router.use((req, res, next) => {
  console.log('Users route accessed at:', new Date());
  next();
});

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;

// main app.js
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
```

### Middleware

#### Built-in Middleware
```javascript
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/public', express.static('public'));

// CORS
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'https://myapp.com'],
  credentials: true
}));
```

#### Custom Middleware
```javascript
// Logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

app.use(requestLogger);
app.use('/api/protected', authenticateToken);
```

### Error Handling
```javascript
// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Default error
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.method} ${req.path} not found` 
  });
};

app.use(errorHandler);
app.use(notFound);
```

---

## 4. Python for Backend Development

### Python Fundamentals for Backend

#### Object-Oriented Programming
```python
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
        self.created_at = datetime.now()
    
    def to_dict(self):
        return {
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f"User(name='{self.name}', email='{self.email}')"

class UserManager:
    def __init__(self):
        self.users = []
    
    def add_user(self, name, email):
        if self.get_user_by_email(email):
            raise ValueError("User with this email already exists")
        
        user = User(name, email)
        self.users.append(user)
        return user
    
    def get_user_by_email(self, email):
        return next((user for user in self.users if user.email == email), None)
```

#### Exception Handling
```python
import logging
from typing import Optional, Dict, Any

class APIError(Exception):
    """Base exception for API errors"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ValidationError(APIError):
    """Raised when data validation fails"""
    def __init__(self, message: str):
        super().__init__(message, 400)

def process_user_data(user_data: Dict[str, Any]) -> Optional[User]:
    try:
        # Validate required fields
        required_fields = ['name', 'email']
        for field in required_fields:
            if field not in user_data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Create user
        user = User(user_data['name'], user_data['email'])
        return user
        
    except ValidationError:
        raise  # Re-raise validation errors
    except Exception as e:
        logging.error(f"Unexpected error processing user data: {e}")
        raise APIError("Internal server error")
```

#### Decorators
```python
from functools import wraps
import time

def timing_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"{func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper

def validate_json(required_fields):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Assuming request is available in scope
            data = request.get_json()
            if not data:
                return jsonify({"error": "JSON data required"}), 400
            
            for field in required_fields:
                if field not in data:
                    return jsonify({"error": f"Missing field: {field}"}), 400
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@app.route('/api/users', methods=['POST'])
@validate_json(['name', 'email'])
@timing_decorator
def create_user():
    data = request.get_json()
    # Process user creation
    pass
```

---

## 5. Flask Framework

### Getting Started with Flask

```python
from flask import Flask, request, jsonify
from datetime import datetime
import uuid

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['DEBUG'] = True

# In-memory storage (use database in production)
users = []

@app.route('/')
def home():
    return jsonify({
        'message': 'Welcome to Flask API',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'uptime': 'unknown',  # Calculate actual uptime
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

### Flask Routing and Views

#### Route Decorators
```python
from flask import Flask, request, jsonify, abort

@app.route('/api/users', methods=['GET'])
def get_users():
    # Query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    
    # Filter users
    filtered_users = [
        user for user in users 
        if search.lower() in user['name'].lower() or search.lower() in user['email'].lower()
    ] if search else users
    
    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated_users = filtered_users[start:end]
    
    return jsonify({
        'users': paginated_users,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': len(filtered_users),
            'pages': (len(filtered_users) + per_page - 1) // per_page
        }
    })

@app.route('/api/users/<string:user_id>', methods=['GET'])
def get_user(user_id):
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        abort(404)
    return jsonify({'user': user})

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    
    # Validation
    if not data:
        return jsonify({'error': 'JSON data required'}), 400
    
    required_fields = ['name', 'email']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    
    # Check for duplicate email
    if any(u['email'] == data['email'] for u in users):
        return jsonify({'error': 'Email already exists'}), 409
    
    # Create user
    user = {
        'id': str(uuid.uuid4()),
        'name': data['name'],
        'email': data['email'],
        'created_at': datetime.now().isoformat()
    }
    users.append(user)
    
    return jsonify({'user': user}), 201
```

#### Blueprints for Organization
```python
# blueprints/users.py
from flask import Blueprint, request, jsonify
from models.user import UserManager

users_bp = Blueprint('users', __name__, url_prefix='/api/users')
user_manager = UserManager()

@users_bp.route('', methods=['GET'])
def list_users():
    return jsonify({'users': user_manager.get_all_users()})

@users_bp.route('', methods=['POST'])
def create_user():
    data = request.get_json()
    try:
        user = user_manager.create_user(data)
        return jsonify({'user': user.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

# main app.py
from blueprints.users import users_bp
app.register_blueprint(users_bp)
```

### Flask Error Handling
```python
from flask import jsonify

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource was not found'
    }), 404

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'The request could not be processed'
    }), 400

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500

# Custom exception handling
@app.errorhandler(ValidationError)
def handle_validation_error(e):
    return jsonify({
        'error': 'Validation Error',
        'message': str(e)
    }), 400
```

---

## 6. Django Introduction

### Django Basics

```python
# settings.py
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'myapp',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### Django Models
```python
# models.py
from django.db import models
from django.contrib.auth.models import User

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f'Comment by {self.author.username} on {self.post.title}'
```

### Django REST Framework
```python
# serializers.py
from rest_framework import serializers
from .models import Post, Comment

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'content', 'author', 'created_at']

class PostSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'created_at', 'updated_at', 'published', 'comments']

# views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(author=request.user, post=post)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
```

---

## 7. Framework Comparison

### Express.js vs Flask vs Django

| Feature | Express.js | Flask | Django |
|---------|------------|-------|--------|
| **Language** | JavaScript | Python | Python |
| **Learning Curve** | Moderate | Easy | Steep |
| **Performance** | High | Moderate | Moderate |
| **Flexibility** | Very High | High | Moderate |
| **Built-in Features** | Minimal | Minimal | Comprehensive |
| **Database ORM** | External (Mongoose, Sequelize) | External (SQLAlchemy) | Built-in (Django ORM) |
| **Admin Interface** | External | External | Built-in |
| **Authentication** | External | External | Built-in |
| **Best For** | APIs, Real-time apps | APIs, Prototypes | Full-stack web apps |

### When to Choose Which?

#### Choose Express.js if:
- Building JavaScript-based full-stack applications
- Need high performance and concurrency
- Want maximum flexibility and control
- Building real-time applications (WebSockets)
- Team already familiar with JavaScript

#### Choose Flask if:
- Building Python-based applications
- Want simplicity and minimalism
- Need to prototype quickly
- Prefer to choose your own components
- Building microservices

#### Choose Django if:
- Building complex, feature-rich applications
- Want built-in admin interface
- Need robust authentication and authorization
- Building content management systems
- Want convention over configuration

---

## 📋 Module 2 Assignment

Build a complete REST API using your chosen framework with the following requirements:

### Technical Requirements

1. **Framework Setup**: Choose Express.js, Flask, or Django
2. **CRUD Operations**: Implement full CRUD for at least 2 resources
3. **Data Validation**: Validate input data and return appropriate errors
4. **Error Handling**: Implement comprehensive error handling
5. **API Documentation**: Document all endpoints with examples
6. **Testing**: Test all endpoints thoroughly

### API Specification

Build a **Library Management API** with these endpoints:

#### Books Resource
```
GET    /api/books          # List all books (with pagination)
GET    /api/books/:id      # Get specific book
POST   /api/books          # Create new book
PUT    /api/books/:id      # Update book
DELETE /api/books/:id      # Delete book
GET    /api/books/search?q=title  # Search books
```

#### Authors Resource  
```
GET    /api/authors        # List all authors
GET    /api/authors/:id    # Get specific author
POST   /api/authors        # Create new author
PUT    /api/authors/:id    # Update author
DELETE /api/authors/:id    # Delete author
GET    /api/authors/:id/books  # Get books by author
```

### Data Models

#### Book
```json
{
  "id": "string",
  "title": "string (required)",
  "author_id": "string (required)",
  "isbn": "string (unique)",
  "publication_year": "number",
  "genre": "string",
  "pages": "number",
  "available": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Author
```json
{
  "id": "string", 
  "name": "string (required)",
  "birth_year": "number",
  "nationality": "string",
  "biography": "text",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Submission Requirements

1. **Source Code**: Complete, well-organized code
2. **README**: Setup instructions and API documentation
3. **Postman Collection**: Test collection for all endpoints
4. **Error Scenarios**: Handle and test error cases
5. **Code Quality**: Clean, commented, and organized code

---

## 🎯 Key Takeaways

- JavaScript and Python are both excellent choices for backend development
- Express.js offers flexibility and performance for Node.js applications
- Flask provides simplicity and minimalism for Python development
- Django offers a comprehensive, batteries-included approach
- Framework choice depends on project requirements, team skills, and preferences
- Understanding multiple frameworks makes you a more versatile developer

---

## 📖 Additional Resources

### Books
- "Learning Node.js Development" by Andrew Mead
- "Flask Web Development" by Miguel Grinberg  
- "Django for Professionals" by William Vincent
- "You Don't Know JS" series by Kyle Simpson

### Online Resources
- [Express.js Official Guide](https://expressjs.com/en/guide/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Tools
- [Nodemon](https://nodemon.io/) - Auto-restart Node.js applications
- [Postman](https://postman.com) - API testing and documentation
- [Insomnia](https://insomnia.rest/) - REST API client

---

## ➡️ Next Steps

Ready for Module 3? Let's dive into databases and data management:
- [Module 3: Databases & Data Management](../03-databases/)

---

*Keep building and experimenting! 🚀*