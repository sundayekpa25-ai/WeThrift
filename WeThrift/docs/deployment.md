# WeThrift Deployment Guide

## Overview

This guide covers deploying WeThrift to various environments including development, staging, and production. The platform is designed for containerized deployment with support for multiple cloud providers.

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for production)
- Domain name and SSL certificates
- Supabase project setup
- Payment gateway accounts (Paystack, Flutterwave)
- USSD provider integration
- SMS service (Twilio)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/wethrift.git
cd wethrift
```

### 2. Environment Configuration

Copy the environment template and configure:

```bash
cp env.example .env.production
```

Fill in the production values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id

# Database
DATABASE_URL=postgresql://user:pass@host:5432/wethrift

# Authentication
NEXTAUTH_SECRET=your-secure-random-string
NEXTAUTH_URL=https://yourdomain.com

# Payment Gateways
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key

# USSD Configuration
USSD_PROVIDER_URL=https://your-ussd-provider.com/api
USSD_PROVIDER_API_KEY=your-ussd-api-key
USSD_SHORT_CODE=*123#

# SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Redis Configuration
REDIS_URL=redis://redis:6379

# App Configuration
APP_NAME=WeThrift
APP_URL=https://yourdomain.com
APP_ENV=production
```

## Database Setup

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the migration script:

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Seed initial data
npm run db:seed
```

### 2. Database Migrations

```bash
# Generate types from database
npm run db:generate

# Reset database (development only)
npm run db:reset
```

## Docker Deployment

### 1. Build and Run with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale the application
docker-compose up -d --scale app=3
```

### 2. Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check Redis
docker-compose exec redis redis-cli ping

# Check all services
docker-compose ps
```

### 3. SSL Certificate Setup

```bash
# Generate SSL certificates (Let's Encrypt)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx directory
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem

# Restart nginx
docker-compose restart nginx
```

## Kubernetes Deployment

### 1. Create Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wethrift
```

### 2. ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wethrift-config
  namespace: wethrift
data:
  APP_NAME: "WeThrift"
  APP_ENV: "production"
  REDIS_URL: "redis://redis-service:6379"
```

### 3. Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: wethrift-secrets
  namespace: wethrift
type: Opaque
data:
  NEXT_PUBLIC_SUPABASE_URL: <base64-encoded-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY: <base64-encoded-key>
  SUPABASE_SERVICE_ROLE_KEY: <base64-encoded-key>
  NEXTAUTH_SECRET: <base64-encoded-secret>
  PAYSTACK_SECRET_KEY: <base64-encoded-key>
  FLUTTERWAVE_SECRET_KEY: <base64-encoded-key>
  TWILIO_AUTH_TOKEN: <base64-encoded-token>
  SMTP_PASS: <base64-encoded-password>
```

### 4. Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wethrift-app
  namespace: wethrift
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wethrift-app
  template:
    metadata:
      labels:
        app: wethrift-app
    spec:
      containers:
      - name: app
        image: ghcr.io/your-org/wethrift:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: wethrift-config
        - secretRef:
            name: wethrift-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 5. Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: wethrift-service
  namespace: wethrift
spec:
  selector:
    app: wethrift-app
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### 6. Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wethrift-ingress
  namespace: wethrift
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "10"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - yourdomain.com
    - www.yourdomain.com
    secretName: wethrift-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wethrift-service
            port:
              number: 80
  - host: www.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wethrift-service
            port:
              number: 80
```

### 7. Redis Deployment

```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: wethrift
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: wethrift
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: wethrift
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

### 8. Apply Kubernetes Resources

```bash
# Apply all resources
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n wethrift

# Check service status
kubectl get svc -n wethrift

# Check ingress status
kubectl get ingress -n wethrift
```

## Cloud Provider Deployments

### AWS Deployment

#### 1. EKS Setup

```bash
# Create EKS cluster
eksctl create cluster --name wethrift-cluster --region us-west-2 --nodegroup-name workers --node-type t3.medium --nodes 3

# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=wethrift-cluster
```

#### 2. RDS for PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier wethrift-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username wethrift \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-12345678
```

#### 3. ElastiCache for Redis

```bash
# Create ElastiCache cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id wethrift-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### Google Cloud Platform

#### 1. GKE Setup

```bash
# Create GKE cluster
gcloud container clusters create wethrift-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium

# Get credentials
gcloud container clusters get-credentials wethrift-cluster --zone us-central1-a
```

#### 2. Cloud SQL

```bash
# Create Cloud SQL instance
gcloud sql instances create wethrift-db \
  --database-version POSTGRES_13 \
  --tier db-f1-micro \
  --region us-central1
```

### Azure

#### 1. AKS Setup

```bash
# Create AKS cluster
az aks create \
  --resource-group wethrift-rg \
  --name wethrift-cluster \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-addons monitoring

# Get credentials
az aks get-credentials --resource-group wethrift-rg --name wethrift-cluster
```

## CI/CD Pipeline

### GitHub Actions

The CI/CD pipeline is configured in `.github/workflows/ci-cd.yml` and includes:

1. **Testing**: Unit tests, integration tests, linting
2. **Security**: Vulnerability scanning, dependency audit
3. **Building**: Docker image creation and registry push
4. **Deployment**: Automated deployment to staging/production
5. **Mobile**: Android APK and iOS build generation

### Manual Deployment

```bash
# Build and push Docker image
docker build -t ghcr.io/your-org/wethrift:latest .
docker push ghcr.io/your-org/wethrift:latest

# Deploy to Kubernetes
kubectl set image deployment/wethrift-app app=ghcr.io/your-org/wethrift:latest -n wethrift

# Check rollout status
kubectl rollout status deployment/wethrift-app -n wethrift
```

## Monitoring and Logging

### 1. Prometheus and Grafana

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring

# Install Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
```

### 2. Application Logs

```bash
# View application logs
kubectl logs -f deployment/wethrift-app -n wethrift

# View logs from all pods
kubectl logs -f -l app=wethrift-app -n wethrift
```

### 3. Health Monitoring

```bash
# Check application health
curl https://yourdomain.com/api/health

# Check database connection
curl https://yourdomain.com/api/health/db

# Check Redis connection
curl https://yourdomain.com/api/health/redis
```

## Backup and Recovery

### 1. Database Backup

```bash
# Create database backup
pg_dump -h your-db-host -U wethrift -d wethrift > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h your-db-host -U wethrift -d wethrift < backup_20240101_120000.sql
```

### 2. Redis Backup

```bash
# Create Redis backup
kubectl exec -it deployment/redis -n wethrift -- redis-cli BGSAVE

# Copy backup file
kubectl cp wethrift/redis-pod:/data/dump.rdb ./redis-backup.rdb
```

### 3. Automated Backups

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: wethrift
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:13
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /backup/backup_$(date +%Y%m%d_%H%M%S).sql
              aws s3 cp /backup/ s3://wethrift-backups/ --recursive
            env:
            - name: DB_HOST
              value: "your-db-host"
            - name: DB_USER
              value: "wethrift"
            - name: DB_NAME
              value: "wethrift"
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            emptyDir: {}
          restartPolicy: OnFailure
```

## Security Considerations

### 1. Network Security

- Use private subnets for database and Redis
- Configure security groups/firewall rules
- Enable VPC flow logs
- Use WAF for application protection

### 2. Secrets Management

- Use Kubernetes secrets or external secret managers
- Rotate secrets regularly
- Never commit secrets to version control
- Use RBAC for secret access

### 3. SSL/TLS

- Use Let's Encrypt for free SSL certificates
- Configure HSTS headers
- Use TLS 1.2+ only
- Regular certificate renewal

### 4. Access Control

- Implement RBAC in Kubernetes
- Use service accounts for pod access
- Enable audit logging
- Regular access review

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   kubectl exec -it deployment/wethrift-app -n wethrift -- nc -zv your-db-host 5432
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis connectivity
   kubectl exec -it deployment/wethrift-app -n wethrift -- redis-cli -h redis-service ping
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   kubectl top pods -n wethrift
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   kubectl describe certificate wethrift-tls -n wethrift
   ```

### Log Analysis

```bash
# Search for errors in logs
kubectl logs deployment/wethrift-app -n wethrift | grep -i error

# Monitor real-time logs
kubectl logs -f deployment/wethrift-app -n wethrift --tail=100
```

## Performance Optimization

### 1. Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: wethrift-hpa
  namespace: wethrift
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: wethrift-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. CDN Configuration

```bash
# Configure CloudFlare or AWS CloudFront
# Set up caching rules for static assets
# Configure edge locations for better performance
```

### 3. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_contributions_user_id_created_at ON contributions(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_loans_status_created_at ON loans(status, created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM contributions WHERE user_id = 'uuid' ORDER BY created_at DESC;
```

## Maintenance

### 1. Regular Updates

- Update dependencies monthly
- Apply security patches immediately
- Update Kubernetes cluster quarterly
- Monitor for deprecated APIs

### 2. Capacity Planning

- Monitor resource usage
- Plan for traffic growth
- Scale resources proactively
- Review costs regularly

### 3. Disaster Recovery

- Test backup restoration regularly
- Document recovery procedures
- Maintain disaster recovery plan
- Conduct DR drills quarterly

## Support

For deployment support:
- Email: devops@wethrift.com
- Documentation: https://docs.wethrift.com
- Status Page: https://status.wethrift.com
