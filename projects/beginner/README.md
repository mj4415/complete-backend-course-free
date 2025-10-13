# Beginner Projects 🚀

This section contains hands-on projects designed for beginners who have completed Modules 1-3 of the backend course.

## 📋 Projects Overview

| Project | Difficulty | Duration | Key Concepts |
|---------|------------|----------|---------------|
| [Personal Blog API](#1-personal-blog-api) | ⭐ | 2-3 days | CRUD, File System, Basic Routes |
| [Todo List API](#2-todo-list-api) | ⭐⭐ | 3-4 days | Authentication, Data Persistence |
| [Weather API Wrapper](#3-weather-api-wrapper) | ⭐⭐ | 2-3 days | Third-party APIs, Error Handling |
| [URL Shortener](#4-url-shortener) | ⭐⭐ | 3-4 days | Database Design, Redirects |
| [Simple Chat API](#5-simple-chat-api) | ⭐⭐⭐ | 4-5 days | Real-time, WebSockets |

---

## 1. Personal Blog API

### 📖 Description
Create a RESTful API for a personal blog that allows creating, reading, updating, and deleting blog posts.

### 🎯 Learning Goals
- Master CRUD operations
- File system operations
- Input validation
- Error handling
- API documentation

### 🔧 Technical Requirements

#### Endpoints
```
GET    /api/posts          # Get all posts
GET    /api/posts/:id      # Get specific post
POST   /api/posts          # Create new post
PUT    /api/posts/:id      # Update post
DELETE /api/posts/:id      # Delete post
GET    /api/posts/search   # Search posts by title/content
```

#### Data Structure
```json
{
  "id": "unique-id",
  "title": "Post Title",
  "content": "Post content here...",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "published": true
}
```

#### Features
- [ ] CRUD operations for blog posts
- [ ] Input validation (required fields, data types)
- [ ] Search functionality by title or content
- [ ] Filter posts by tags
- [ ] Pagination for post listings
- [ ] Basic error handling with proper HTTP status codes
- [ ] File-based data persistence (JSON files)

### 🚀 Getting Started

#### JavaScript/Node.js Version
```bash
mkdir personal-blog-api
cd personal-blog-api
npm init -y
npm install express uuid
```

#### Python/Flask Version
```bash
mkdir personal-blog-api-python
cd personal-blog-api-python
python -m venv venv
source venv/bin/activate
pip install flask
```

### 💡 Implementation Tips

1. **Data Storage**: Start with JSON files, create a `data/posts.json`
2. **ID Generation**: Use UUID for unique post IDs
3. **Validation**: Check required fields before saving
4. **Search**: Implement simple string matching for search
5. **Error Handling**: Return appropriate HTTP status codes

### 🧪 Testing Checklist

- [ ] Create a new blog post
- [ ] Retrieve all posts
- [ ] Retrieve a specific post by ID
- [ ] Update an existing post
- [ ] Delete a post
- [ ] Search posts by keyword
- [ ] Handle invalid requests gracefully

---

## 2. Todo List API

### 📖 Description
Build a task management API with user authentication and personal todo lists.

### 🎯 Learning Goals
- User authentication with JWT
- Protected routes
- User-specific data
- Task management logic
- Database relationships

### 🔧 Technical Requirements

#### Authentication Endpoints
```
POST   /api/auth/register  # User registration
POST   /api/auth/login     # User login
GET    /api/auth/profile   # Get user profile (protected)
```

#### Todo Endpoints (Protected)
```
GET    /api/todos          # Get user's todos
POST   /api/todos          # Create new todo
PUT    /api/todos/:id      # Update todo
DELETE /api/todos/:id      # Delete todo
PATCH  /api/todos/:id/complete  # Mark as complete
GET    /api/todos/stats    # Get completion statistics
```

#### Data Structures

**User:**
```json
{
  "id": "user-id",
  "username": "john_doe",
  "email": "john@example.com",
  "password_hash": "hashed-password",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Todo:**
```json
{
  "id": "todo-id",
  "user_id": "user-id",
  "title": "Complete project",
  "description": "Finish the todo list API",
  "completed": false,
  "priority": "high",
  "due_date": "2025-01-15T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### Features
- [ ] User registration and login
- [ ] JWT-based authentication
- [ ] Protected routes (authentication required)
- [ ] CRUD operations for todos
- [ ] Mark todos as complete/incomplete
- [ ] Filter todos by completion status
- [ ] Priority levels (low, medium, high)
- [ ] Due dates for todos
- [ ] User statistics (total, completed, pending)

### 💡 Implementation Tips

1. **Password Security**: Use bcrypt for password hashing
2. **JWT**: Implement JWT for stateless authentication
3. **Middleware**: Create authentication middleware
4. **Data Separation**: Ensure users can only access their own todos
5. **Validation**: Validate todo data and user input

---

## 3. Weather API Wrapper

### 📖 Description
Create an API that fetches weather data from a third-party service and provides a simplified interface.

### 🎯 Learning Goals
- Third-party API integration
- Data transformation
- Caching strategies
- Error handling for external services
- Rate limiting

### 🔧 Technical Requirements

#### Endpoints
```
GET    /api/weather/current/:city     # Current weather
GET    /api/weather/forecast/:city    # 5-day forecast
GET    /api/weather/history/:city     # Historical data
POST   /api/weather/favorites         # Add favorite city
GET    /api/weather/favorites         # Get favorite cities
```

#### Features
- [ ] Integration with OpenWeatherMap API
- [ ] Current weather information
- [ ] 5-day weather forecast
- [ ] City search with validation
- [ ] Favorite cities management
- [ ] Response caching (5-minute cache)
- [ ] Rate limiting (100 requests per hour)
- [ ] Proper error handling for API failures
- [ ] Data transformation and filtering

### 🚀 Setup

1. **Get API Key**: Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. **Environment Variables**: Store API key securely
3. **Install Dependencies**: axios for HTTP requests, node-cache for caching

---

## 4. URL Shortener

### 📖 Description
Build a service that creates short URLs from long ones, similar to bit.ly or tinyurl.

### 🎯 Learning Goals
- Database design
- URL validation
- Custom algorithms (URL generation)
- Redirect handling
- Analytics basics

### 🔧 Technical Requirements

#### Endpoints
```
POST   /api/shorten        # Create short URL
GET    /:shortCode         # Redirect to original URL
GET    /api/urls/:id       # Get URL details
GET    /api/urls           # List user's URLs (if authenticated)
DELETE /api/urls/:id       # Delete URL
GET    /api/urls/:id/stats # Get click statistics
```

#### Data Structure
```json
{
  "id": "url-id",
  "original_url": "https://example.com/very/long/url",
  "short_code": "abc123",
  "short_url": "http://localhost:3000/abc123",
  "clicks": 15,
  "created_at": "2025-01-01T00:00:00Z",
  "expires_at": "2025-02-01T00:00:00Z",
  "user_id": "user-id" // optional
}
```

#### Features
- [ ] URL validation
- [ ] Short code generation (6-8 characters)
- [ ] Redirect functionality
- [ ] Click tracking
- [ ] Optional expiration dates
- [ ] Custom short codes (if available)
- [ ] Basic analytics (click count, creation date)
- [ ] Duplicate URL handling

---

## 5. Simple Chat API

### 📖 Description
Create a real-time chat API supporting multiple chat rooms and user messaging.

### 🎯 Learning Goals
- WebSocket implementation
- Real-time communication
- Room/channel management
- Message persistence
- Event handling

### 🔧 Technical Requirements

#### HTTP Endpoints
```
POST   /api/auth/login     # User login
GET    /api/rooms          # Get available rooms
POST   /api/rooms          # Create new room
GET    /api/rooms/:id/messages  # Get room message history
```

#### WebSocket Events
```javascript
// Client to Server
socket.emit('join-room', { roomId: 'room123' });
socket.emit('send-message', { roomId: 'room123', message: 'Hello!' });
socket.emit('typing-start', { roomId: 'room123' });
socket.emit('typing-stop', { roomId: 'room123' });

// Server to Client
socket.on('message-received', data);
socket.on('user-joined', data);
socket.on('user-left', data);
socket.on('typing-indicator', data);
```

#### Features
- [ ] Real-time messaging with WebSockets
- [ ] Multiple chat rooms
- [ ] User authentication
- [ ] Message history persistence
- [ ] Typing indicators
- [ ] User join/leave notifications
- [ ] Room creation and management
- [ ] Online user list
- [ ] Message timestamps

### 💡 Implementation Tips

1. **WebSockets**: Use Socket.IO for easier implementation
2. **Rooms**: Implement room-based messaging
3. **Authentication**: Authenticate WebSocket connections
4. **Persistence**: Store messages in database or files
5. **Events**: Handle various socket events properly

---

## 🎯 Project Completion Guidelines

### For Each Project:

1. **Planning Phase**
   - Review requirements thoroughly
   - Design your API endpoints
   - Plan your data structures
   - Set up your development environment

2. **Development Phase**
   - Start with basic CRUD operations
   - Add authentication if required
   - Implement additional features
   - Test each endpoint thoroughly

3. **Testing Phase**
   - Test all endpoints with Postman
   - Handle edge cases and errors
   - Verify data persistence
   - Test authentication flows

4. **Documentation Phase**
   - Create API documentation
   - Include setup instructions
   - Add example requests/responses
   - Document any special features

5. **Deployment Phase**
   - Prepare for deployment
   - Set up environment variables
   - Test in production-like environment
   - Create deployment guide

### 📦 Deliverables

For each completed project, provide:
- [ ] Complete source code
- [ ] README with setup instructions
- [ ] API documentation (endpoints, examples)
- [ ] Testing instructions
- [ ] Screenshots or demo video
- [ ] Reflection on challenges and learnings

---

## 🏆 Certification Requirements

To receive your beginner certification:
- Complete at least 3 out of 5 projects
- Meet all technical requirements
- Submit clean, documented code
- Pass project reviews
- Demonstrate understanding in project explanations

---

## 🤝 Getting Help

- **GitHub Issues**: Create issues for technical problems
- **Discussions**: Join community discussions for general questions
- **Code Review**: Request code review for completed projects
- **Office Hours**: Join weekly community calls

---

## 📚 Additional Resources

### Tools
- [Postman](https://postman.com) - API testing
- [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client) - VS Code API client
- [JSON Formatter](https://jsonformatter.curiousconcept.com/) - Format JSON responses

### Documentation
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Flask Quickstart](https://flask.palletsprojects.com/en/2.0.x/quickstart/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)

### Testing
- [Jest](https://jestjs.io/) - JavaScript testing
- [pytest](https://pytest.org/) - Python testing
- [Supertest](https://github.com/visionmedia/supertest) - HTTP assertion library

---

*Ready to build something amazing? Choose your first project and start coding! 🚀*