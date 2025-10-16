# WeThrift API Documentation

## Overview

The WeThrift API provides comprehensive endpoints for managing thrift groups, savings, loans, escrow transactions, and user interactions across USSD, web, and mobile platforms.

## Base URL

```
Production: https://api.wethrift.com
Staging: https://staging-api.wethrift.com
Development: http://localhost:3000
```

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **API Endpoints**: 10 requests per second per IP
- **USSD Endpoints**: 5 requests per second per IP
- **Authentication**: 5 requests per minute per IP

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "error": null
}
```

## Error Responses

```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Authentication Endpoints

### POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token"
    }
  }
}
```

### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678",
  "dateOfBirth": "1990-01-01",
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "postalCode": "100001",
  "acceptTerms": true
}
```

### POST /api/auth/logout

Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Group Management

### GET /api/groups

List groups with optional filtering.

**Query Parameters:**
- `userId` - Get groups for a specific user
- `query` - Search groups by name or description
- `limit` - Number of results to return (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tech Savers",
      "description": "A group for tech professionals",
      "group_type": "community",
      "admin_id": "uuid",
      "current_members": 25,
      "max_members": 100,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/groups

Create a new group.

**Request Body:**
```json
{
  "name": "Tech Savers",
  "description": "A group for tech professionals",
  "groupType": "community",
  "maxMembers": 100,
  "privacySettings": {
    "isPublic": true,
    "allowInvites": true,
    "requireApproval": false
  }
}
```

### GET /api/groups/[id]

Get group details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Tech Savers",
    "description": "A group for tech professionals",
    "group_type": "community",
    "admin": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe"
    },
    "members": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "first_name": "Jane",
          "last_name": "Smith"
        },
        "role": "member",
        "joined_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST /api/groups/[id]/join

Join a group using invite code.

**Request Body:**
```json
{
  "inviteCode": "ABC123XYZ"
}
```

## Savings & Contributions

### GET /api/savings

List savings products.

**Query Parameters:**
- `groupId` - Filter by group ID
- `type` - Filter by product type (target_savings, fixed_savings, turn_by_turn)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Emergency Fund",
      "type": "target_savings",
      "target_amount": 500000,
      "current_amount": 125000,
      "interest_rate": 5.0,
      "duration_months": 12,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    }
  ]
}
```

### POST /api/savings

Create a new savings product.

**Request Body:**
```json
{
  "groupId": "uuid",
  "name": "Emergency Fund",
  "type": "target_savings",
  "targetAmount": 500000,
  "interestRate": 5.0,
  "durationMonths": 12,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "settings": {
    "allowEarlyWithdrawal": false,
    "penaltyRate": 2.0,
    "autoWithdrawal": true,
    "withdrawalSchedule": "monthly"
  }
}
```

### POST /api/contributions

Make a contribution.

**Request Body:**
```json
{
  "groupId": "uuid",
  "savingsProductId": "uuid",
  "amount": 10000,
  "contributionType": "manual",
  "paymentMethod": "ussd",
  "dueDate": "2024-02-01"
}
```

### GET /api/contributions

List contributions.

**Query Parameters:**
- `userId` - Filter by user ID
- `groupId` - Filter by group ID
- `status` - Filter by status (pending, completed, failed, cancelled)

## Loans

### GET /api/loans

List loans.

**Query Parameters:**
- `userId` - Filter by user ID
- `groupId` - Filter by group ID
- `status` - Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": 100000,
      "interest_rate": 15.0,
      "duration_months": 6,
      "status": "approved",
      "purpose": "Business expansion",
      "outstanding_balance": 85000,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/loans

Apply for a loan.

**Request Body:**
```json
{
  "groupId": "uuid",
  "amount": 100000,
  "purpose": "Business expansion",
  "durationMonths": 6,
  "collateral": {
    "type": "property",
    "description": "House in Lagos",
    "value": 5000000
  },
  "guarantors": [
    {
      "userId": "uuid",
      "relationship": "friend"
    }
  ]
}
```

### PUT /api/loans/[id]/approve

Approve a loan application.

**Request Body:**
```json
{
  "approvedAmount": 100000,
  "notes": "Approved for business expansion"
}
```

### POST /api/loans/[id]/repay

Make a loan repayment.

**Request Body:**
```json
{
  "amount": 20000,
  "paymentMethod": "ussd"
}
```

## Escrow Transactions

### GET /api/escrow

List escrow transactions.

**Query Parameters:**
- `userId` - Filter by user ID
- `groupId` - Filter by group ID
- `status` - Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": 50000,
      "description": "Purchase of laptop",
      "status": "funded",
      "buyer": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe"
      },
      "seller": {
        "id": "uuid",
        "first_name": "Jane",
        "last_name": "Smith"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/escrow

Create an escrow transaction.

**Request Body:**
```json
{
  "sellerId": "uuid",
  "groupId": "uuid",
  "amount": 50000,
  "description": "Purchase of laptop",
  "paymentMethod": "ussd"
}
```

### PUT /api/escrow/[id]/fund

Fund an escrow transaction.

**Request Body:**
```json
{
  "paymentReference": "PAY123456789"
}
```

### PUT /api/escrow/[id]/release

Release escrow funds.

**Request Body:**
```json
{
  "reason": "Buyer confirmed receipt of goods"
}
```

### PUT /api/escrow/[id]/dispute

Dispute an escrow transaction.

**Request Body:**
```json
{
  "reason": "Goods not as described"
}
```

## Complaints

### GET /api/complaints

List complaints.

**Query Parameters:**
- `userId` - Filter by user ID
- `groupId` - Filter by group ID
- `status` - Filter by status
- `type` - Filter by type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "transaction",
      "category": "payment_issue",
      "title": "Payment not processed",
      "description": "My contribution was not processed",
      "status": "open",
      "priority": "high",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/complaints

Submit a complaint.

**Request Body:**
```json
{
  "groupId": "uuid",
  "type": "transaction",
  "category": "payment_issue",
  "title": "Payment not processed",
  "description": "My contribution was not processed",
  "priority": "high"
}
```

### PUT /api/complaints/[id]/resolve

Resolve a complaint.

**Request Body:**
```json
{
  "resolution": "Payment has been processed and funds credited"
}
```

## USSD Integration

### POST /api/ussd

Process USSD requests.

**Request Body:**
```json
{
  "sessionId": "session123",
  "phoneNumber": "+2348012345678",
  "userInput": "1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Welcome to WeThrift\n\n1. Login\n2. Register\n3. Help\n0. Exit",
    "shouldEnd": false,
    "nextMenu": "auth"
  }
}
```

### GET /api/ussd

Health check endpoint for USSD provider.

**Response:**
```json
{
  "success": true,
  "message": "WeThrift USSD Service is running",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Commission Management

### GET /api/commissions

List commission rates.

**Query Parameters:**
- `serviceType` - Filter by service type
- `groupId` - Filter by group ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "service_type": "savings",
      "rate_percentage": 2.5,
      "minimum_amount": 0,
      "maximum_amount": null,
      "group_id": null,
      "is_active": true
    }
  ]
}
```

### POST /api/commissions

Create a commission rate.

**Request Body:**
```json
{
  "serviceType": "savings",
  "ratePercentage": 2.5,
  "minimumAmount": 0,
  "maximumAmount": 1000000,
  "groupId": "uuid"
}
```

## System Configuration

### GET /api/config

Get system configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "appName": "WeThrift",
    "appVersion": "1.0.0",
    "features": {
      "enableUSSD": true,
      "enableMobileApp": true,
      "enableWebPortal": true
    },
    "limits": {
      "maxGroupMembers": 1000,
      "minContributionAmount": 100
    }
  }
}
```

### PUT /api/config

Update system configuration (admin only).

**Request Body:**
```json
{
  "key": "app_name",
  "value": "WeThrift Pro",
  "type": "string"
}
```

## Webhooks

### POST /api/webhooks/payment

Payment gateway webhook.

**Headers:**
```
X-Paystack-Signature: <signature>
```

**Request Body:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "TXN123456789",
    "amount": 10000,
    "status": "success"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## SDKs

### JavaScript/TypeScript
```bash
npm install @wethrift/sdk
```

```javascript
import { WeThriftClient } from '@wethrift/sdk'

const client = new WeThriftClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.wethrift.com'
})

// Login
const { data } = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
})

// Create group
const group = await client.groups.create({
  name: 'Tech Savers',
  description: 'A group for tech professionals',
  groupType: 'community'
})
```

### React Native
```bash
npm install @wethrift/react-native
```

```javascript
import { WeThriftProvider } from '@wethrift/react-native'

function App() {
  return (
    <WeThriftProvider apiKey="your-api-key">
      <YourApp />
    </WeThriftProvider>
  )
}
```

## Support

For API support, please contact:
- Email: api-support@wethrift.com
- Documentation: https://docs.wethrift.com
- Status Page: https://status.wethrift.com
