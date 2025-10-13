# Advanced Projects 🚀

This section contains expert-level projects designed for developers who have mastered Modules 1-7 and are ready for production-grade challenges.

## 📋 Projects Overview

| Project | Difficulty | Duration | Key Concepts |
|---------|------------|----------|---------------|
| [Microservices E-commerce](#1-microservices-e-commerce) | ⭐⭐⭐⭐⭐ | 3-4 weeks | Distributed systems, service mesh |
| [Real-time Collaboration Tool](#2-real-time-collaboration-tool) | ⭐⭐⭐⭐ | 2-3 weeks | WebRTC, operational transformation |
| [Video Streaming Backend](#3-video-streaming-backend) | ⭐⭐⭐⭐⭐ | 3-4 weeks | Media processing, CDN, adaptive streaming |
| [IoT Data Collection Platform](#4-iot-data-collection-platform) | ⭐⭐⭐⭐ | 2-3 weeks | Time-series data, real-time analytics |
| [Multi-tenant SaaS Backend](#5-multi-tenant-saas-backend) | ⭐⭐⭐⭐⭐ | 4-5 weeks | Multi-tenancy, enterprise features |

---

## 1. Microservices E-commerce

### 📖 Description
Build a distributed e-commerce system using microservices architecture with API Gateway, service discovery, and inter-service communication.

### 🎯 Learning Goals
- Microservices architecture patterns
- API Gateway implementation
- Service discovery and registration
- Inter-service communication
- Distributed data management
- Event-driven architecture
- Service mesh implementation
- Distributed monitoring and logging

### 🏢 Service Architecture

```
┌─────────────┐    ┌──────────────────┐
│ API Gateway   │────├──── Client Apps   │
└─────┬─────┘    └──────────────────┘
     │
┌────┼────────────────────────────┐
│     │                                │
│  ┌──┴──┐  ┌────────┐  ┌────────┐  │
│  │ User  │  │Product│  │ Order  │  │
│  │Service│  │Service│  │Service│  │
│  └──┬──┘  └──┬─────┘  └──┬─────┘  │
│     │        │           │       │
│  ┌──┴──┐  ┌─┬──────┐  ┌─┴─────┐  │
│  │Payment│  │I│nventory│  │Shipping│  │
│  │Service│  │S│Service│  │Service│  │
│  └───────┘  └─┴──────┘  └───────┘  │
└────────────────────────────────┘
           ┌───┴────────────────┐
           │   Message Queue/Event Bus │
           └────────────────────┘
```

### Services Implementation

#### API Gateway
```javascript
// gateway/server.js
const express = require('express');
const httpProxy = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// Service registry
const services = {
  user: 'http://user-service:3001',
  product: 'http://product-service:3002',
  order: 'http://order-service:3003',
  payment: 'http://payment-service:3004',
  inventory: 'http://inventory-service:3005'
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

// Proxy configuration
const createProxyMiddleware = (target, pathRewrite = {}) => {
  return httpProxy({
    target,
    changeOrigin: true,
    pathRewrite,
    onProxyReq: (proxyReq, req) => {
      // Add user context to service requests
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  });
};

// Route definitions
app.use('/api/auth', createProxyMiddleware(services.user, {
  '^/api/auth': '/auth'
}));

app.use('/api/users', authenticateToken, createProxyMiddleware(services.user, {
  '^/api/users': '/users'
}));

app.use('/api/products', createProxyMiddleware(services.product, {
  '^/api/products': '/products'
}));

app.use('/api/orders', authenticateToken, createProxyMiddleware(services.order, {
  '^/api/orders': '/orders'
}));

app.use('/api/payments', authenticateToken, createProxyMiddleware(services.payment, {
  '^/api/payments': '/payments'
}));

// Health check aggregation
app.get('/health', async (req, res) => {
  const healthChecks = {};
  
  for (const [serviceName, serviceUrl] of Object.entries(services)) {
    try {
      const response = await axios.get(`${serviceUrl}/health`, { timeout: 2000 });
      healthChecks[serviceName] = {
        status: 'healthy',
        responseTime: response.duration
      };
    } catch (error) {
      healthChecks[serviceName] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: healthChecks,
    timestamp: new Date()
  });
});

app.listen(3000, () => {
  console.log('API Gateway running on port 3000');
});
```

#### Event-Driven Communication

```javascript
// shared/eventBus.js
const EventEmitter = require('events');
const Redis = require('redis');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.publisher = Redis.createClient(process.env.REDIS_URL);
    this.subscriber = Redis.createClient(process.env.REDIS_URL);
    
    this.subscriber.subscribe('events');
    this.subscriber.on('message', this.handleEvent.bind(this));
  }
  
  async publish(eventType, data, metadata = {}) {
    const event = {
      id: require('uuid').v4(),
      type: eventType,
      data,
      metadata: {
        ...metadata,
        service: process.env.SERVICE_NAME,
        timestamp: new Date(),
        version: '1.0'
      }
    };
    
    await this.publisher.publish('events', JSON.stringify(event));
    console.log(`Published event: ${eventType}`, event.id);
  }
  
  handleEvent(channel, message) {
    try {
      const event = JSON.parse(message);
      this.emit(event.type, event.data, event.metadata);
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }
  
  subscribe(eventType, handler) {
    this.on(eventType, handler);
  }
}

module.exports = new EventBus();

// Usage in Order Service
const eventBus = require('./shared/eventBus');

// Listen for inventory updates
eventBus.subscribe('inventory.updated', async (data) => {
  console.log('Inventory updated for product:', data.productId);
  // Update local cache or trigger revalidation
});

// Publish order events
const createOrder = async (orderData) => {
  const order = await Order.create(orderData);
  
  // Publish event for other services
  await eventBus.publish('order.created', {
    orderId: order.id,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount
  });
  
  return order;
};
```

### Docker Compose for Microservices

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  gateway:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - user-service
      - product-service
      - order-service
    networks:
      - microservices

  # User Service
  user-service:
    build: ./services/user
    environment:
      - MONGODB_URI=mongodb://mongo-user:27017/users
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo-user
      - redis
    networks:
      - microservices

  # Product Service
  product-service:
    build: ./services/product
    environment:
      - MONGODB_URI=mongodb://mongo-product:27017/products
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo-product
      - redis
    networks:
      - microservices

  # Order Service
  order-service:
    build: ./services/order
    environment:
      - MONGODB_URI=mongodb://mongo-order:27017/orders
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
      - PAYMENT_SERVICE_URL=http://payment-service:3004
    depends_on:
      - mongo-order
      - redis
    networks:
      - microservices

  # Payment Service
  payment-service:
    build: ./services/payment
    environment:
      - MONGODB_URI=mongodb://mongo-payment:27017/payments
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo-payment
      - redis
    networks:
      - microservices

  # Databases
  mongo-user:
    image: mongo:7
    volumes:
      - user-data:/data/db
    networks:
      - microservices

  mongo-product:
    image: mongo:7
    volumes:
      - product-data:/data/db
    networks:
      - microservices

  mongo-order:
    image: mongo:7
    volumes:
      - order-data:/data/db
    networks:
      - microservices

  mongo-payment:
    image: mongo:7
    volumes:
      - payment-data:/data/db
    networks:
      - microservices

  # Redis for caching and messaging
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - microservices

  # Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - microservices

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - microservices

volumes:
  user-data:
  product-data:
  order-data:
  payment-data:
  redis-data:
  grafana-data:

networks:
  microservices:
    driver: bridge
```

---

## 2. Real-time Collaboration Tool

### 📖 Description
Create a collaborative workspace similar to Google Docs or Notion with real-time editing, commenting, and version control.

### 🎯 Learning Goals
- Operational Transformation (OT)
- Conflict-free Replicated Data Types (CRDTs)
- Real-time synchronization
- Version control systems
- Collaborative editing algorithms
- WebRTC for peer-to-peer communication

### 🔧 Technical Requirements

#### Core Features
- Real-time document editing
- Multiple cursor tracking
- Comment and suggestion system
- Version history and rollback
- Collaborative spaces/workspaces
- Permission management
- Offline support with sync
- Export/import capabilities

#### WebSocket Implementation

```javascript
// Real-time collaboration server
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

// Document state management
class DocumentState {
  constructor(documentId) {
    this.documentId = documentId;
    this.content = '';
    this.version = 0;
    this.operations = [];
    this.activeUsers = new Map();
    this.cursors = new Map();
  }
  
  // Apply operational transformation
  applyOperation(operation, userId) {
    try {
      // Transform operation against concurrent operations
      const transformedOp = this.transformOperation(operation);
      
      // Apply to content
      this.content = this.applyOpToContent(this.content, transformedOp);
      this.version++;
      
      // Store operation
      this.operations.push({
        ...transformedOp,
        version: this.version,
        userId,
        timestamp: new Date()
      });
      
      return transformedOp;
    } catch (error) {
      throw new Error('Failed to apply operation');
    }
  }
  
  transformOperation(operation) {
    // Simplified OT implementation
    let transformedOp = { ...operation };
    
    // Transform against recent operations
    for (const op of this.operations.slice(-10)) {
      if (op.version >= operation.baseVersion) {
        transformedOp = this.transform(transformedOp, op);
      }
    }
    
    return transformedOp;
  }
  
  transform(op1, op2) {
    // Basic transformation logic for insert/delete operations
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return op1;
      } else {
        return { ...op1, position: op1.position + op2.content.length };
      }
    }
    // Add more transformation rules...
    return op1;
  }
}

// Socket connection handling
const documentStates = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-document', async (data) => {
    const { documentId, userId } = data;
    
    // Join document room
    socket.join(documentId);
    
    // Initialize or get document state
    if (!documentStates.has(documentId)) {
      const document = await Document.findById(documentId);
      documentStates.set(documentId, new DocumentState(documentId));
      documentStates.get(documentId).content = document.content;
    }
    
    const docState = documentStates.get(documentId);
    
    // Add user to active users
    docState.activeUsers.set(socket.id, {
      userId,
      socketId: socket.id,
      joinedAt: new Date()
    });
    
    // Send current document state
    socket.emit('document-state', {
      content: docState.content,
      version: docState.version,
      activeUsers: Array.from(docState.activeUsers.values())
    });
    
    // Notify other users
    socket.to(documentId).emit('user-joined', {
      userId,
      socketId: socket.id
    });
  });
  
  socket.on('operation', async (data) => {
    try {
      const { documentId, operation } = data;
      const docState = documentStates.get(documentId);
      const userId = docState.activeUsers.get(socket.id)?.userId;
      
      if (!docState || !userId) {
        return socket.emit('error', { message: 'Invalid document or user' });
      }
      
      // Apply operation
      const transformedOp = docState.applyOperation(operation, userId);
      
      // Broadcast to other users
      socket.to(documentId).emit('operation', {
        operation: transformedOp,
        userId,
        version: docState.version
      });
      
      // Acknowledge to sender
      socket.emit('operation-ack', {
        version: docState.version
      });
      
      // Save to database periodically
      if (docState.version % 10 === 0) {
        await Document.findByIdAndUpdate(documentId, {
          content: docState.content,
          version: docState.version,
          lastModified: new Date()
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Operation failed' });
    }
  });
  
  socket.on('cursor-position', (data) => {
    const { documentId, position } = data;
    const docState = documentStates.get(documentId);
    const userId = docState?.activeUsers.get(socket.id)?.userId;
    
    if (docState && userId) {
      docState.cursors.set(userId, position);
      
      socket.to(documentId).emit('cursor-update', {
        userId,
        position
      });
    }
  });
  
  socket.on('disconnect', () => {
    // Clean up user from all documents
    for (const [docId, docState] of documentStates.entries()) {
      if (docState.activeUsers.has(socket.id)) {
        const userId = docState.activeUsers.get(socket.id).userId;
        docState.activeUsers.delete(socket.id);
        docState.cursors.delete(userId);
        
        socket.to(docId).emit('user-left', { userId });
      }
    }
  });
});
```

---

## 3. Video Streaming Backend

### 📖 Description
Build a video streaming platform with upload processing, adaptive bitrate streaming, live streaming capabilities, and content delivery optimization.

### 🎯 Learning Goals
- Video encoding and transcoding
- Adaptive bitrate streaming (HLS/DASH)
- Content Delivery Network (CDN) integration
- Live streaming protocols (RTMP, WebRTC)
- Media storage optimization
- Bandwidth optimization
- Video analytics

### 🔧 Technical Requirements

#### Core Features
- Video upload and processing
- Multiple quality transcoding
- Adaptive streaming delivery
- Live streaming support
- Video analytics and metrics
- Content moderation
- Subtitle and caption support
- Video recommendations

#### Video Processing Pipeline

```javascript
// Video processing service
const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const Bull = require('bull');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const videoQueue = new Bull('video processing', {
  redis: process.env.REDIS_URL
});

class VideoProcessor {
  static async processVideo(videoPath, videoId) {
    const qualities = [
      { name: '480p', width: 854, height: 480, bitrate: '1000k' },
      { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
      { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' }
    ];
    
    const processedVersions = [];
    
    for (const quality of qualities) {
      const outputPath = `/tmp/${videoId}_${quality.name}.mp4`;
      const hlsPath = `/tmp/${videoId}_${quality.name}/playlist.m3u8`;
      
      // Transcode to MP4
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .size(`${quality.width}x${quality.height}`)
          .videoBitrate(quality.bitrate)
          .audioCodec('aac')
          .videoCodec('libx264')
          .format('mp4')
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      // Generate HLS segments
      await new Promise((resolve, reject) => {
        ffmpeg(outputPath)
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-hls_time 10',
            '-hls_list_size 0',
            '-hls_segment_filename', `/tmp/${videoId}_${quality.name}/segment%03d.ts`
          ])
          .output(hlsPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      // Upload to S3
      const s3Key = `videos/${videoId}/${quality.name}/`;
      
      // Upload playlist
      await this.uploadToS3(hlsPath, `${s3Key}playlist.m3u8`);
      
      // Upload segments
      const fs = require('fs');
      const segmentFiles = fs.readdirSync(`/tmp/${videoId}_${quality.name}/`)
        .filter(file => file.endsWith('.ts'));
      
      for (const segment of segmentFiles) {
        const segmentPath = `/tmp/${videoId}_${quality.name}/${segment}`;
        await this.uploadToS3(segmentPath, `${s3Key}${segment}`);
      }
      
      processedVersions.push({
        quality: quality.name,
        resolution: `${quality.width}x${quality.height}`,
        bitrate: quality.bitrate,
        playlistUrl: `${process.env.CDN_URL}/${s3Key}playlist.m3u8`
      });
    }
    
    return processedVersions;
  }
  
  static async uploadToS3(filePath, key) {
    const fileContent = require('fs').readFileSync(filePath);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: this.getContentType(key)
    };
    
    return s3.upload(params).promise();
  }
  
  static getContentType(filename) {
    if (filename.endsWith('.m3u8')) return 'application/x-mpegURL';
    if (filename.endsWith('.ts')) return 'video/MP2T';
    if (filename.endsWith('.mp4')) return 'video/mp4';
    return 'application/octet-stream';
  }
  
  // Generate video thumbnail
  static async generateThumbnail(videoPath, videoId) {
    const thumbnailPath = `/tmp/${videoId}_thumbnail.jpg`;
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%', '25%', '50%'],
          filename: `${videoId}_thumb_%i.jpg`,
          folder: '/tmp/thumbnails/',
          size: '320x240'
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Upload thumbnails to S3
    const thumbnails = [];
    for (let i = 1; i <= 3; i++) {
      const thumbPath = `/tmp/thumbnails/${videoId}_thumb_${i}.jpg`;
      const s3Key = `thumbnails/${videoId}/thumb_${i}.jpg`;
      await this.uploadToS3(thumbPath, s3Key);
      thumbnails.push(`${process.env.CDN_URL}/${s3Key}`);
    }
    
    return thumbnails;
  }
}

// Queue job processing
videoQueue.process('process-video', async (job) => {
  const { videoPath, videoId } = job.data;
  
  try {
    // Update status
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 10
    });
    
    // Generate thumbnails
    const thumbnails = await VideoProcessor.generateThumbnail(videoPath, videoId);
    
    await Video.findByIdAndUpdate(videoId, {
      thumbnails,
      processingProgress: 30
    });
    
    // Process video qualities
    const versions = await VideoProcessor.processVideo(videoPath, videoId);
    
    // Update database
    await Video.findByIdAndUpdate(videoId, {
      status: 'ready',
      versions,
      processingProgress: 100,
      processedAt: new Date()
    });
    
    // Cleanup temporary files
    require('fs').unlinkSync(videoPath);
    
    return { videoId, versions, thumbnails };
  } catch (error) {
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      error: error.message
    });
    throw error;
  }
});
```

---

## 4. IoT Data Collection Platform

### 📖 Description
Create a platform for collecting, processing, and analyzing IoT sensor data with real-time dashboards and alert systems.

### 🎯 Learning Goals
- Time-series data handling
- High-throughput data ingestion
- Real-time data processing
- IoT device management
- Stream processing
- Anomaly detection
- Data visualization APIs

### 🔧 Technical Requirements

#### Core Features
- IoT device registration and management
- High-volume data ingestion
- Time-series data storage
- Real-time alerting
- Dashboard data APIs
- Data aggregation and analytics
- Device monitoring and diagnostics

#### Time-Series Database Implementation

```javascript
// Using InfluxDB for time-series data
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN
});

const writeApi = influxDB.getWriteApi(
  process.env.INFLUXDB_ORG,
  process.env.INFLUXDB_BUCKET
);

class IoTDataService {
  static async ingestData(deviceId, sensorType, value, timestamp) {
    const point = new Point('sensor_data')
      .tag('device_id', deviceId)
      .tag('sensor_type', sensorType)
      .floatField('value', value)
      .timestamp(timestamp);
    
    writeApi.writePoint(point);
    
    // Check for alerts
    await this.checkAlerts(deviceId, sensorType, value);
  }
  
  static async batchIngest(dataPoints) {
    const points = dataPoints.map(data => 
      new Point('sensor_data')
        .tag('device_id', data.deviceId)
        .tag('sensor_type', data.sensorType)
        .floatField('value', data.value)
        .timestamp(data.timestamp)
    );
    
    writeApi.writePoints(points);
    await writeApi.flush();
  }
  
  static async getDeviceData(deviceId, startTime, endTime) {
    const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG);
    
    const query = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r["device_id"] == "${deviceId}")
        |> aggregateWindow(every: 1m, fn: mean)
        |> yield(name: "mean")
    `;
    
    const results = [];
    
    return new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const rowObject = tableMeta.toObject(row);
          results.push({
            timestamp: rowObject._time,
            sensorType: rowObject.sensor_type,
            value: rowObject._value
          });
        },
        error: reject,
        complete: () => resolve(results)
      });
    });
  }
  
  static async checkAlerts(deviceId, sensorType, value) {
    const alerts = await Alert.find({
      deviceId,
      sensorType,
      isActive: true
    });
    
    for (const alert of alerts) {
      let triggered = false;
      
      switch (alert.condition.type) {
        case 'threshold':
          triggered = alert.condition.operator === 'gt' 
            ? value > alert.condition.value
            : value < alert.condition.value;
          break;
        case 'rate_of_change':
          // Implement rate of change detection
          break;
        case 'anomaly':
          // Implement anomaly detection
          break;
      }
      
      if (triggered) {
        await this.triggerAlert(alert, deviceId, value);
      }
    }
  }
  
  static async triggerAlert(alert, deviceId, value) {
    // Create alert record
    const alertRecord = await AlertEvent.create({
      alertId: alert._id,
      deviceId,
      value,
      triggeredAt: new Date()
    });
    
    // Send notifications
    const notificationPromises = alert.notifications.map(notification => {
      switch (notification.type) {
        case 'email':
          return this.sendEmailAlert(notification.recipient, alert, value);
        case 'webhook':
          return this.sendWebhookAlert(notification.url, alert, value);
        case 'slack':
          return this.sendSlackAlert(notification.channel, alert, value);
      }
    });
    
    await Promise.allSettled(notificationPromises);
  }
}
```

---

## 5. Multi-tenant SaaS Backend

### 📖 Description
Develop a multi-tenant SaaS platform with organization management, subscription billing, feature flags, and enterprise-grade security.

### 🎯 Learning Goals
- Multi-tenant architecture patterns
- Data isolation strategies
- Subscription and billing systems
- Feature flag implementation
- Enterprise authentication (SSO)
- Audit logging and compliance
- Scalable architecture design

### 🔧 Technical Requirements

#### Multi-tenancy Patterns

**Shared Database with Tenant ID**
```javascript
// Middleware to inject tenant context
const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract tenant from subdomain or header
    const tenantId = req.headers['x-tenant-id'] || 
                     req.subdomains[0] || 
                     extractTenantFromDomain(req.hostname);
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant identification required' });
    }
    
    // Validate tenant
    const tenant = await Tenant.findOne({ 
      $or: [{ id: tenantId }, { subdomain: tenantId }],
      status: 'active'
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    req.tenant = tenant;
    
    // Set up tenant-scoped database queries
    req.tenantQuery = (model) => {
      return model.find({ tenantId: tenant._id });
    };
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
};

// Tenant-aware model
const userSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  // other fields...
});

// Compound index for tenant-scoped queries
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, username: 1 }, { unique: true });

// Pre-save hook to ensure tenant context
userSchema.pre('save', function(next) {
  if (!this.tenantId) {
    return next(new Error('Tenant ID is required'));
  }
  next();
});

const User = mongoose.model('User', userSchema);
```

#### Subscription & Billing System

```javascript
// Subscription management
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
  static async createSubscription(tenantId, planId, paymentMethodId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      const plan = await Plan.findById(planId);
      
      // Create Stripe customer if not exists
      if (!tenant.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: tenant.email,
          name: tenant.name,
          metadata: {
            tenantId: tenantId.toString()
          }
        });
        
        tenant.stripeCustomerId = customer.id;
        await tenant.save();
      }
      
      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: tenant.stripeCustomerId
      });
      
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: tenant.stripeCustomerId,
        items: [{
          price: plan.stripePriceId,
          quantity: 1
        }],
        default_payment_method: paymentMethodId,
        metadata: {
          tenantId: tenantId.toString(),
          planId: planId.toString()
        }
      });
      
      // Update tenant subscription
      await Tenant.findByIdAndUpdate(tenantId, {
        subscription: {
          stripeSubscriptionId: subscription.id,
          planId,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });
      
      return subscription;
    } catch (error) {
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }
  
  static async handleWebhook(event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
    }
  }
  
  static async handlePaymentSucceeded(invoice) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const tenantId = subscription.metadata.tenantId;
    
    await Tenant.findByIdAndUpdate(tenantId, {
      'subscription.status': 'active',
      'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
      'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
    });
  }
}

// Feature flag system
class FeatureFlags {
  static async isEnabled(tenantId, featureName) {
    const tenant = await Tenant.findById(tenantId).populate('plan');
    
    // Check plan features
    if (tenant.plan.features.includes(featureName)) {
      return true;
    }
    
    // Check custom feature overrides
    const override = await FeatureOverride.findOne({
      tenantId,
      featureName,
      isActive: true
    });
    
    return override ? override.enabled : false;
  }
  
  static middleware(featureName) {
    return async (req, res, next) => {
      const isEnabled = await this.isEnabled(req.tenant._id, featureName);
      
      if (!isEnabled) {
        return res.status(403).json({
          error: 'Feature not available',
          feature: featureName,
          upgrade: 'Please upgrade your plan to access this feature'
        });
      }
      
      next();
    };
  }
}

// Usage
app.get('/api/advanced-analytics',
  authenticateToken,
  tenantMiddleware,
  FeatureFlags.middleware('advanced_analytics'),
  getAdvancedAnalytics
);
```

---

## 🎯 Advanced Project Guidelines

### Architecture Requirements

1. **Scalability**
   - Design for horizontal scaling
   - Implement caching at multiple levels
   - Use message queues for async processing
   - Plan for database sharding/partitioning

2. **Reliability**
   - Implement circuit breakers
   - Add retry mechanisms with exponential backoff
   - Design for graceful degradation
   - Implement health checks and monitoring

3. **Performance**
   - Sub-100ms response times for API calls
   - Handle 1000+ concurrent users
   - Implement efficient data structures
   - Optimize database queries

4. **Security**
   - Implement OAuth 2.0 and OpenID Connect
   - Add audit logging for all actions
   - Encrypt sensitive data at rest
   - Implement API versioning and deprecation

### 📦 Advanced Deliverables

For each completed project, provide:
- [ ] **System Architecture Diagram**: Detailed system design
- [ ] **Database Design**: ERD and schema documentation
- [ ] **API Documentation**: OpenAPI specification
- [ ] **Performance Benchmarks**: Load testing results
- [ ] **Security Audit**: Vulnerability assessment
- [ ] **Monitoring Setup**: Metrics and alerting
- [ ] **Deployment Guide**: Production deployment
- [ ] **Maintenance Guide**: Troubleshooting and updates
- [ ] **Code Quality Report**: Static analysis results
- [ ] **Disaster Recovery Plan**: Backup and recovery procedures

---

## 🏆 Expert Certification Requirements

To receive your advanced certification:
- Complete at least 2 out of 5 projects
- Demonstrate enterprise-grade architecture
- Implement comprehensive monitoring
- Pass rigorous security audit
- Present to technical review board
- Mentor intermediate developers
- Contribute to course improvements

---

## 🤝 Expert Community

- **Architecture Reviews**: Present designs to expert panel
- **Code Reviews**: Peer review with senior developers
- **Technical Talks**: Share knowledge with community
- **Open Source**: Contribute to related projects
- **Mentorship**: Guide other learners

---

## 📚 Expert Resources

### Books
- "Microservices Patterns" by Chris Richardson
- "Building Event-Driven Microservices" by Adam Bellemare
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Site Reliability Engineering" by Google SRE Team

### Advanced Topics
- [Martin Fowler's Architecture Articles](https://martinfowler.com/architecture/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [Google Cloud Architecture](https://cloud.google.com/architecture/)
- [System Design Interview Resources](https://github.com/checkcheckzz/system-design-interview)

### Tools & Platforms
- [Kubernetes](https://kubernetes.io/) - Container orchestration
- [Istio](https://istio.io/) - Service mesh
- [Apache Kafka](https://kafka.apache.org/) - Event streaming
- [Elasticsearch](https://www.elastic.co/) - Search and analytics
- [Grafana](https://grafana.com/) - Monitoring and visualization

---

## 🎆 Graduation & Next Steps

Congratulations on reaching the advanced level! You're now ready for:

- **Senior Backend Engineer** roles
- **System Architecture** positions
- **Technical Leadership** opportunities
- **Open Source Contributions**
- **Speaking at Conferences**
- **Mentoring Other Developers**

### Career Advancement
- Build your personal brand through blogging
- Contribute to open source projects
- Speak at meetups and conferences
- Network with other senior engineers
- Stay updated with emerging technologies

---

*You've mastered the art of backend development. Now go build something amazing! 🎆*