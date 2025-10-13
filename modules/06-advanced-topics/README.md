# Module 6: Advanced Topics

## 🎯 Learning Objectives

By the end of this module, you will understand:
- Caching strategies and implementation
- Real-time communication with WebSockets
- Microservices architecture patterns
- Message queues and background jobs
- File upload and management
- Performance optimization techniques
- Monitoring and logging
- Advanced security concepts

## 📚 Table of Contents

1. [Caching Strategies](#1-caching-strategies)
2. [WebSockets & Real-time Communication](#2-websockets--real-time-communication)
3. [Microservices Architecture](#3-microservices-architecture)
4. [Message Queues & Background Jobs](#4-message-queues--background-jobs)
5. [File Upload & Management](#5-file-upload--management)
6. [Performance Optimization](#6-performance-optimization)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Advanced Security](#8-advanced-security)

---

## 1. Caching Strategies

### Redis Caching Implementation

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

class CacheService {
  static async get(key) {
    try {
      const result = await client.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  static async set(key, value, ttl = 3600) {
    try {
      await client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  static async del(key) {
    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  static async flush() {
    try {
      await client.flushall();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
}

// Cache-aside pattern
const getUserById = async (userId) => {
  const cacheKey = `user:${userId}`;
  
  // Try to get from cache first
  let user = await CacheService.get(cacheKey);
  if (user) {
    return user;
  }
  
  // Not in cache, get from database
  user = await User.findById(userId);
  if (user) {
    // Cache for 1 hour
    await CacheService.set(cacheKey, user, 3600);
  }
  
  return user;
};

// Write-through cache
const updateUser = async (userId, updateData) => {
  // Update database
  const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
  
  // Update cache
  const cacheKey = `user:${userId}`;
  await CacheService.set(cacheKey, user, 3600);
  
  return user;
};
```

---

## 2. WebSockets & Real-time Communication

### Socket.IO Implementation

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

io.use(authenticateSocket);

// Connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.username} connected`);
  
  // Join user to personal room
  socket.join(`user:${socket.user.userId}`);
  
  // Handle chat room joining
  socket.on('join-room', async (roomId) => {
    try {
      // Verify user has access to room
      const hasAccess = await verifyRoomAccess(socket.user.userId, roomId);
      if (!hasAccess) {
        return socket.emit('error', { message: 'Access denied to room' });
      }
      
      socket.join(roomId);
      
      // Notify others in room
      socket.to(roomId).emit('user-joined', {
        userId: socket.user.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
      
      // Send recent messages
      const recentMessages = await getRecentMessages(roomId, 50);
      socket.emit('recent-messages', recentMessages);
      
    } catch (error) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Handle message sending
  socket.on('send-message', async (data) => {
    try {
      const { roomId, message, messageType = 'text' } = data;
      
      // Validate message
      if (!message || message.trim().length === 0) {
        return socket.emit('error', { message: 'Message cannot be empty' });
      }
      
      // Save message to database
      const savedMessage = await Message.create({
        roomId,
        senderId: socket.user.userId,
        message: message.trim(),
        messageType,
        timestamp: new Date()
      });
      
      // Populate sender info
      await savedMessage.populate('senderId', 'username avatar');
      
      // Emit to all users in room
      io.to(roomId).emit('message-received', savedMessage);
      
      // Update room last activity
      await updateRoomActivity(roomId);
      
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing-start', (roomId) => {
    socket.to(roomId).emit('user-typing', {
      userId: socket.user.userId,
      username: socket.user.username,
      isTyping: true
    });
  });
  
  socket.on('typing-stop', (roomId) => {
    socket.to(roomId).emit('user-typing', {
      userId: socket.user.userId,
      username: socket.user.username,
      isTyping: false
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected`);
    
    // Notify all rooms user was in
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-left', {
          userId: socket.user.userId,
          username: socket.user.username,
          timestamp: new Date()
        });
      }
    });
  });
});

// Real-time notifications
const sendNotification = (userId, notification) => {
  io.to(`user:${userId}`).emit('notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: new Date()
  });
};

module.exports = { io, sendNotification };
```

---

## 3. Microservices Architecture

### Service Communication Pattern

```javascript
// User Service
const express = require('express');
const axios = require('axios');
const app = express();

class UserService {
  static async createUser(userData) {
    const user = await User.create(userData);
    
    // Publish user creation event
    await EventBus.publish('user.created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    });
    
    return user;
  }
  
  static async getUserWithPosts(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Call Posts Service
    try {
      const postsResponse = await axios.get(
        `${process.env.POSTS_SERVICE_URL}/posts/user/${userId}`,
        {
          headers: {
            'X-Service-Token': process.env.SERVICE_TOKEN
          },
          timeout: 5000
        }
      );
      
      user.posts = postsResponse.data.posts;
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      user.posts = []; // Graceful degradation
    }
    
    return user;
  }
}

// Event Bus implementation
class EventBus {
  static async publish(eventType, data) {
    try {
      // Using Redis as message broker
      await redis.publish('events', JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date(),
        serviceId: process.env.SERVICE_ID
      }));
    } catch (error) {
      console.error('Failed to publish event:', error);
    }
  }
  
  static subscribe(eventType, handler) {
    const subscriber = redis.createClient();
    
    subscriber.subscribe('events');
    subscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message);
        if (event.type === eventType) {
          handler(event.data);
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    });
  }
}

// Posts Service listening for user events
EventBus.subscribe('user.created', async (userData) => {
  console.log('User created:', userData.userId);
  // Initialize user posts collection or perform other actions
});

EventBus.subscribe('user.deleted', async (userData) => {
  console.log('User deleted:', userData.userId);
  // Clean up user posts
  await Post.deleteMany({ userId: userData.userId });
});
```

---

## 4. Message Queues & Background Jobs

### Bull Queue Implementation

```javascript
const Bull = require('bull');
const nodemailer = require('nodemailer');

// Create queues
const emailQueue = new Bull('email processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  }
});

const imageQueue = new Bull('image processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  }
});

// Email job processor
emailQueue.process('welcome-email', async (job) => {
  const { userEmail, userName } = job.data;
  
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: 'Welcome to Our Platform!',
    html: `
      <h1>Welcome ${userName}!</h1>
      <p>Thank you for joining our platform.</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
  return { status: 'sent', email: userEmail };
});

// Image processing job
imageQueue.process('resize-image', async (job) => {
  const { imagePath, sizes } = job.data;
  const sharp = require('sharp');
  const path = require('path');
  
  const processedImages = [];
  
  for (const size of sizes) {
    const outputPath = path.join(
      'uploads/resized',
      `${path.parse(imagePath).name}_${size.width}x${size.height}.jpg`
    );
    
    await sharp(imagePath)
      .resize(size.width, size.height)
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    processedImages.push({
      size: `${size.width}x${size.height}`,
      path: outputPath
    });
  }
  
  return processedImages;
});

// Job scheduling and monitoring
class JobService {
  static async scheduleWelcomeEmail(userEmail, userName) {
    const job = await emailQueue.add('welcome-email', {
      userEmail,
      userName
    }, {
      delay: 5000, // Send after 5 seconds
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    return job.id;
  }
  
  static async scheduleImageProcessing(imagePath) {
    const job = await imageQueue.add('resize-image', {
      imagePath,
      sizes: [
        { width: 150, height: 150 }, // thumbnail
        { width: 300, height: 300 }, // medium
        { width: 800, height: 600 }  // large
      ]
    });
    
    return job.id;
  }
  
  static async getJobStatus(jobId, queueName) {
    const queue = queueName === 'email' ? emailQueue : imageQueue;
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }
    
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress(),
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason
    };
  }
}

// Queue monitoring dashboard
const Arena = require('bull-arena');

const arena = Arena({
  queues: [
    {
      name: 'email processing',
      hostId: 'Email Queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
      }
    },
    {
      name: 'image processing',
      hostId: 'Image Queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
      }
    }
  ]
}, {
  basePath: '/admin/queues',
  disableListen: true
});

app.use('/admin/queues', arena);
```

---

## 5. File Upload & Management

### Multer with Cloud Storage

```javascript
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage configuration
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: process.env.NODE_ENV === 'production' ? cloudinaryStorage : localStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// File upload routes
app.post('/api/upload/single', 
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded'
        });
      }
      
      const fileData = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: req.user.userId,
        uploadedAt: new Date()
      };
      
      // Save file metadata to database
      const savedFile = await File.create(fileData);
      
      res.status(201).json({
        status: 'success',
        message: 'File uploaded successfully',
        data: { file: savedFile }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Upload failed',
        error: error.message
      });
    }
  }
);

app.post('/api/upload/multiple',
  upload.array('files', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No files uploaded'
        });
      }
      
      const filePromises = req.files.map(file => {
        return File.create({
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedBy: req.user.userId,
          uploadedAt: new Date()
        });
      });
      
      const savedFiles = await Promise.all(filePromises);
      
      res.status(201).json({
        status: 'success',
        message: 'Files uploaded successfully',
        data: { files: savedFiles }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Upload failed',
        error: error.message
      });
    }
  }
);

// File download route
app.get('/api/files/:fileId/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }
    
    // Check permissions
    if (file.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    // Stream file
    if (process.env.NODE_ENV === 'production') {
      // Redirect to Cloudinary URL
      res.redirect(file.path);
    } else {
      // Serve local file
      res.sendFile(path.resolve(file.path));
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Download failed'
    });
  }
});
```

---

## 6. Performance Optimization

### Database Connection Pooling

```javascript
const mongoose = require('mongoose');

// Optimized MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false // Disable mongoose buffering
});

// Compression middleware
const compression = require('compression');
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Response time middleware
const responseTime = require('response-time');
app.use(responseTime((req, res, time) => {
  console.log(`${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  
  // Log slow queries
  if (time > 1000) {
    console.warn(`Slow request detected: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  }
}));
```

---

## 7. Monitoring & Logging

### Winston Logging

```javascript
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'backend-api',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Add Elasticsearch transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new ElasticsearchTransport({
    level: 'info',
    clientOpts: {
      node: process.env.ELASTICSEARCH_URL
    },
    index: 'application-logs'
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId
    });
  });
  
  next();
};

app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  };
  
  res.status(200).json(healthCheck);
});
```

---

## 8. Advanced Security

### Security Headers and Protection

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const xss = require('xss');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting with different tiers
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Apply different limits
app.use('/api/auth', createRateLimiter(15 * 60 * 1000, 5, 'Too many auth attempts'));
app.use('/api', createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'));

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes at full speed
  delayMs: 500 // slow down subsequent requests by 500ms per request
});

app.use('/api', speedLimiter);

// XSS protection middleware
const xssProtection = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
};

app.use(xssProtection);
```

---

## 📋 Module 6 Assignment

Build an advanced real-time application:

### Project: Real-time Collaborative Task Management

#### Requirements

1. **WebSocket Implementation**
   - Real-time task updates
   - Live collaboration features
   - Typing indicators
   - Online user presence

2. **Caching Strategy**
   - Redis caching implementation
   - Cache invalidation strategies
   - Performance metrics

3. **Background Jobs**
   - Email notifications
   - File processing
   - Scheduled tasks
   - Job monitoring dashboard

4. **File Management**
   - Task attachment uploads
   - Image processing
   - Cloud storage integration

5. **Monitoring & Logging**
   - Comprehensive logging
   - Performance monitoring
   - Health checks
   - Error tracking

6. **Advanced Security**
   - Rate limiting
   - XSS protection
   - Security headers
   - Input sanitization

### Deliverables

- Real-time collaborative application
- Caching implementation
- Background job system
- File upload system
- Monitoring dashboard
- Security implementation
- Performance optimization report

---

## 🎯 Key Takeaways

- Caching dramatically improves application performance
- WebSockets enable real-time user experiences
- Background jobs handle time-consuming tasks
- Proper monitoring is essential for production systems
- Security should be implemented at multiple layers
- Performance optimization is an ongoing process

---

## 📖 Additional Resources

### Documentation
- [Socket.IO Documentation](https://socket.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Winston Logging](https://github.com/winstonjs/winston)

### Tools
- [Bull Dashboard](https://github.com/bee-queue/arena)
- [Elasticsearch](https://www.elastic.co/elasticsearch/)
- [Grafana](https://grafana.com/) - Monitoring

---

## ➡️ Next Steps

Ready for the final module? Let's learn about deployment:
- [Module 7: Deployment & DevOps](../07-deployment/)

---

*Advanced topics unlock the full potential of backend development! 🚀*