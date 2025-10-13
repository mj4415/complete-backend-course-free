# Module 7: Deployment & DevOps

## 🎯 Learning Objectives

By the end of this module, you will understand:
- Cloud platform deployment strategies
- Containerization with Docker
- CI/CD pipeline implementation
- Environment management
- Monitoring and logging in production
- Database deployment and management
- Domain and SSL configuration
- Scaling and load balancing

## 📚 Table of Contents

1. [Production Environment Setup](#1-production-environment-setup)
2. [Containerization with Docker](#2-containerization-with-docker)
3. [Cloud Platform Deployment](#3-cloud-platform-deployment)
4. [CI/CD Pipelines](#4-cicd-pipelines)
5. [Database Deployment](#5-database-deployment)
6. [Domain & SSL Configuration](#6-domain--ssl-configuration)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Scaling & Load Balancing](#8-scaling--load-balancing)

---

## 1. Production Environment Setup

### Environment Variables Management

```javascript
// .env.example
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_FROM=noreply@yourapp.com
EMAIL_SERVICE=gmail
EMAIL_USER=
EMAIL_PASS=
CLIENT_URL=https://yourapp.com
API_URL=https://api.yourapp.com

// config/database.js
const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    };

    if (process.env.NODE_ENV === 'production') {
      options.ssl = true;
      options.sslValidate = true;
    }

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;

// config/index.js
const config = {
  development: {
    database: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp-dev',
      options: {
        maxPoolSize: 5
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    },
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001']
    }
  },
  production: {
    database: {
      uri: process.env.MONGODB_URI,
      options: {
        maxPoolSize: 20,
        ssl: true,
        sslValidate: true
      }
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      tls: {}
    },
    cors: {
      origin: [process.env.CLIENT_URL]
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

---

## 2. Containerization with Docker

### Dockerfile

```dockerfile
# Use official Node.js runtime as base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/myapp
      - REDIS_HOST=redis
    depends_on:
      - mongo
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=myapp
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  mongo-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/ssl/cert.pem;
        ssl_certificate_key /etc/ssl/private.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Auth routes with stricter rate limiting
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://backend;
            access_log off;
        }
    }
}
```

---

## 3. Cloud Platform Deployment

### Heroku Deployment

```json
// package.json
{
  "name": "my-backend-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'Build process completed'",
    "postinstall": "echo 'Dependencies installed successfully'"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

```javascript
// Procfile
web: node server.js
worker: node worker.js
```

### DigitalOcean App Platform

```yaml
# .do/app.yaml
name: my-backend-app
services:
- name: api
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${DATABASE_URL}
  - key: JWT_SECRET
    value: ${JWT_SECRET}
  http_port: 3000
  routes:
  - path: /
    
databases:
- name: mongodb
  engine: MONGODB
  version: "5"
  size: db-s-1vcpu-1gb
```

### AWS Deployment with Elastic Beanstalk

```json
// .ebextensions/01_nodejs.config
{
  "option_settings": {
    "aws:elasticbeanstalk:container:nodejs": {
      "NodeCommand": "npm start",
      "NodeVersion": "18.15.0"
    },
    "aws:elasticbeanstalk:application:environment": {
      "NODE_ENV": "production",
      "NPM_USE_PRODUCTION": "true"
    },
    "aws:autoscaling:launchconfiguration": {
      "InstanceType": "t3.micro",
      "SecurityGroups": "my-security-group"
    },
    "aws:autoscaling:asg": {
      "MinSize": "1",
      "MaxSize": "4"
    }
  }
}
```

---

## 4. CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18.x'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_HOST: localhost
        JWT_SECRET: test-secret
    
    - name: Run linter
      run: npm run lint
    
    - name: Check code coverage
      run: npm run coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Build Docker image
      run: |
        docker build -t ${{ secrets.DOCKER_USERNAME }}/my-backend-app:latest .
        docker build -t ${{ secrets.DOCKER_USERNAME }}/my-backend-app:${{ github.sha }} .
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Push Docker image
      run: |
        docker push ${{ secrets.DOCKER_USERNAME }}/my-backend-app:latest
        docker push ${{ secrets.DOCKER_USERNAME }}/my-backend-app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
        heroku_app_name: "my-backend-app"
        heroku_email: "your-email@example.com"
        usedocker: true
    
    - name: Run database migrations
      run: |
        curl -X POST "https://api.heroku.com/apps/my-backend-app/dynos" \
          -H "Authorization: Bearer ${{ secrets.HEROKU_API_KEY }}" \
          -H "Content-Type: application/json" \
          -d '{"command": "npm run migrate"}'

  notify:
    needs: deploy
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Notify Slack
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

services:
  - mongo:7
  - redis:7

before_script:
  - apt-get update -qq && apt-get install -y -qq git curl
  - curl -sL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  - apt-get install -y nodejs

test:
  stage: test
  script:
    - npm ci
    - npm run lint
    - npm run test
    - npm run coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main

deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to staging"
    # Add staging deployment commands here
  environment:
    name: staging
    url: https://staging.yourapp.com
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - echo "Deploying to production"
    # Add production deployment commands here
  environment:
    name: production
    url: https://yourapp.com
  when: manual
  only:
    - main
```

---

## 5. Database Deployment

### MongoDB Atlas Setup

```javascript
// Database connection with MongoDB Atlas
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 50,
      wtimeoutMS: 2500,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    await mongoose.connect(process.env.MONGODB_ATLAS_URI, options);
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Migration script
const runMigrations = async () => {
  const migrations = [
    require('./migrations/001_add_indexes'),
    require('./migrations/002_update_user_schema'),
    require('./migrations/003_add_audit_fields')
  ];

  for (const migration of migrations) {
    try {
      await migration.up();
      console.log(`Migration ${migration.name} completed`);
    } catch (error) {
      console.error(`Migration ${migration.name} failed:`, error);
      throw error;
    }
  }
};
```

### PostgreSQL on AWS RDS

```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Health check
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
```

---

## 6. Domain & SSL Configuration

### SSL Certificate Setup

```bash
# Using Certbot for Let's Encrypt SSL
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal setup
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare Configuration

```javascript
// Cloudflare security headers middleware
const cloudflareMiddleware = (req, res, next) => {
  // Verify Cloudflare requests
  const cfIp = req.headers['cf-connecting-ip'];
  const cfRay = req.headers['cf-ray'];
  
  if (process.env.NODE_ENV === 'production' && !cfRay) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Use real IP from Cloudflare
  if (cfIp) {
    req.ip = cfIp;
  }
  
  next();
};

app.use(cloudflareMiddleware);
```

---

## 7. Monitoring & Logging

### Application Performance Monitoring

```javascript
// New Relic integration
require('newrelic');

// Sentry error tracking
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
    new Tracing.Integrations.Mongo()
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler
app.use(Sentry.Handlers.errorHandler());

// Prometheus metrics
const promClient = require('prom-client');
const collectDefaultMetrics = promClient.collectDefaultMetrics;

// Collect default metrics
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

---

## 8. Scaling & Load Balancing

### Horizontal Scaling with PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-backend-app',
    script: './server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Load Balancer Configuration

```nginx
# Advanced Nginx load balancing
upstream backend_servers {
    least_conn;
    server backend1.example.com:3000 weight=3;
    server backend2.example.com:3000 weight=2;
    server backend3.example.com:3000 weight=1 backup;
    
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Load balancing method
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 30s;
    }
}
```

---

## 📋 Module 7 Assignment

Deploy a production-ready application:

### Project: Complete Production Deployment

#### Requirements

1. **Containerization**
   - Docker containerization
   - Docker Compose setup
   - Multi-stage build optimization

2. **Cloud Deployment**
   - Deploy to chosen cloud platform
   - Environment configuration
   - Database setup and connection

3. **CI/CD Pipeline**
   - Automated testing
   - Build and deployment pipeline
   - Environment-specific deployments

4. **Domain & SSL**
   - Custom domain configuration
   - SSL certificate setup
   - Security headers

5. **Monitoring**
   - Application monitoring
   - Error tracking
   - Performance metrics
   - Health checks

6. **Scaling**
   - Load balancing setup
   - Auto-scaling configuration
   - Performance optimization

### Deliverables

- Fully deployed production application
- Docker configuration files
- CI/CD pipeline setup
- Monitoring dashboard
- Deployment documentation
- Performance optimization report
- Security audit report

---

## 🎯 Key Takeaways

- Production deployment requires careful planning and configuration
- Containerization improves consistency across environments
- CI/CD pipelines automate and improve deployment reliability
- Monitoring is essential for production applications
- Security should be implemented at every layer
- Scaling strategies should be planned from the beginning
- Documentation is crucial for maintenance and team collaboration

---

## 📖 Additional Resources

### Documentation
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [DigitalOcean Tutorials](https://docs.digitalocean.com/)

### Tools
- [PM2](https://pm2.keymetrics.io/) - Process manager
- [New Relic](https://newrelic.com/) - Application monitoring
- [Sentry](https://sentry.io/) - Error tracking
- [Grafana](https://grafana.com/) - Monitoring and visualization

---

## 🎉 Congratulations!

You've completed the Complete Backend Development Course! You now have the skills to:

- Build robust backend applications
- Design and implement RESTful APIs
- Work with databases effectively
- Implement authentication and security
- Deploy applications to production
- Monitor and scale applications

### Next Steps

- Build your portfolio with the projects from this course
- Contribute to open-source projects
- Stay updated with backend development trends
- Consider specializing in specific technologies
- Share your knowledge with the community

---

*You're now ready to build amazing backend applications! 🚀*