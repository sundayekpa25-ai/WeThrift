# WeThrift - USSD-Centric Thrift Group Contribution Platform

A comprehensive, scalable, and secure platform for community and formal thrift groups implementing savings, loans, turn-by-turn or collective contributions, and dynamic financial products. Accessible via USSD, mobile app, and web portal with a powerful role-based admin ERP/CMS backend.

## 🚀 Features

### Core Features
- **Multi-Channel Access**: USSD for feature phones, cross-platform mobile apps, and responsive web portal with full feature parity
- **Dynamic Financial Products**: Target Savings (individual & corporate), Fixed Savings with flexible funding
- **Group & Community Management**: Create uniquely named groups/communities with automatic admin privileges
- **Role-Based Admin ERP/CMS**: Dynamic editing of UI branding, menus, notifications, workflows, and integrations
- **Robust Automation**: Turn-by-turn contribution scheduling, penalties, loan repayments, and complaints lifecycle
- **Dynamic Commission/Interest Management**: Configurable rates with role-based permissions and group-level controls
- **Escrow Services**: Secure transactional payments with conditional release after buyer satisfaction
- **Complaints Management**: Full lifecycle handling with notifications and escalation
- **Security & Compliance**: OAuth2/2FA authentication, data encryption, audit logging, Nigerian cooperative society compliance

### Technical Features
- **Real-time Dynamic Configuration**: UI branding changes without code deployment
- **Multi-Provider Integration**: USSD, payment gateways, SMS, push notifications
- **Advanced Analytics**: Commission tracking, financial reporting, user insights
- **Scalable Architecture**: Containerized deployment with CI/CD pipeline
- **Comprehensive Testing**: Unit, integration, and E2E testing with deprecated code removal

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Mobile**: React Native (iOS & Android)
- **USSD**: Custom USSD gateway integration
- **Payments**: Paystack, Flutterwave integration
- **Notifications**: Email, SMS (Twilio), Push notifications
- **Deployment**: Docker containers with CI/CD

### Database Schema
- **Users**: Authentication, KYC, preferences, roles
- **Groups**: Community/formal/corporate groups with settings
- **Savings Products**: Target savings, fixed savings, turn-by-turn
- **Contributions**: Manual, scheduled, automated contributions
- **Loans**: Application, approval, disbursement, repayment tracking
- **Escrow**: Conditional payment holds and releases
- **Complaints**: Full lifecycle management with escalation
- **Commission Rates**: Dynamic, role-based, group-specific rates
- **System Configuration**: Dynamic UI and system settings
- **Audit Logs**: Comprehensive activity tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account and project
- Docker (for local development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/wethrift.git
   cd wethrift
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env.local
   # Fill in your Supabase and other service credentials
   ```

4. **Database setup**
   ```bash
   # Apply migrations
   npm run db:reset
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Web: http://localhost:3000
   - USSD: *123# (configured with your USSD provider)
   - Mobile: Run `npm run mobile:ios` or `npm run mobile:android`

## 📱 USSD Integration

### USSD Menu Structure
```
*123#
├── 1. Login
├── 2. Register
├── 3. Help

After Login:
├── 1. Dashboard
│   ├── 1. My Groups
│   ├── 2. Savings
│   ├── 3. Loans
│   ├── 4. Contributions
│   ├── 5. Escrow
│   └── 6. Complaints
├── 2. Groups
│   ├── 1. Join Group
│   ├── 2. Create Group
│   └── 3. My Groups
└── 3. Help
```

### USSD Configuration
1. Set up USSD provider integration
2. Configure short code (*123#)
3. Update environment variables
4. Test USSD flow

## 🔧 Configuration

### Dynamic UI Configuration
The platform supports real-time UI customization through the admin CMS:

- **Branding**: App name, logo, favicon, colors
- **Features**: Enable/disable USSD, mobile app, web portal
- **Integrations**: Payment gateways, USSD providers, SMS providers
- **Limits**: Group members, loan amounts, savings amounts

### Commission & Interest Rates
- **Super Admin**: Set global rates for all services
- **Admin**: Manage rates for assigned services
- **Group Admin**: Set group-specific rates
- **Dynamic Application**: Real-time rate calculation and application

## 🔐 Security

### Authentication & Authorization
- **OAuth2**: Secure authentication with Supabase Auth
- **2FA**: Optional two-factor authentication
- **Role-Based Access**: Granular permissions system
- **Session Management**: Secure session handling

### Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Audit Logging**: Comprehensive activity tracking
- **Compliance**: Nigerian cooperative society regulations
- **Privacy**: GDPR-compliant data handling

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Group Management
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `GET /api/groups/[id]` - Get group details
- `PUT /api/groups/[id]` - Update group
- `POST /api/groups/[id]/join` - Join group

### Savings & Contributions
- `GET /api/savings` - List savings products
- `POST /api/savings` - Create savings product
- `POST /api/contributions` - Make contribution
- `GET /api/contributions` - List contributions

### Loans
- `GET /api/loans` - List loans
- `POST /api/loans` - Apply for loan
- `PUT /api/loans/[id]/approve` - Approve loan
- `POST /api/loans/[id]/repay` - Make repayment

### Escrow
- `GET /api/escrow` - List escrow transactions
- `POST /api/escrow` - Create escrow transaction
- `PUT /api/escrow/[id]/fund` - Fund escrow
- `PUT /api/escrow/[id]/release` - Release escrow

### USSD
- `POST /api/ussd` - Process USSD request
- `GET /api/ussd` - Health check

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Coverage
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: User journeys, USSD flows, mobile app

## 🚀 Deployment

### Production Deployment
1. **Build application**
   ```bash
   npm run build
   ```

2. **Docker deployment**
   ```bash
   docker build -t wethrift .
   docker run -p 3000:3000 wethrift
   ```

3. **Environment configuration**
   - Set production environment variables
   - Configure domain and SSL certificates
   - Set up monitoring and logging

### CI/CD Pipeline
- **Automated Testing**: Run on every commit
- **Code Quality**: ESLint, Prettier, TypeScript checks
- **Security Scanning**: Dependency vulnerability checks
- **Deployment**: Automated deployment to staging/production

## 📈 Monitoring & Analytics

### Application Monitoring
- **Performance**: Response times, error rates
- **Usage**: User activity, feature adoption
- **Financial**: Transaction volumes, commission tracking
- **System**: Server health, database performance

### Business Analytics
- **User Growth**: Registration, activation rates
- **Group Activity**: Group creation, member engagement
- **Financial Metrics**: Savings, loans, contributions
- **Commission Tracking**: Revenue, rate optimization

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Consistent code formatting
- **Testing**: Write tests for new features
- **Documentation**: Update docs for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](./docs/api.md)
- [USSD Integration Guide](./docs/ussd.md)
- [Mobile App Setup](./docs/mobile.md)
- [Deployment Guide](./docs/deployment.md)

### Community
- [GitHub Issues](https://github.com/your-org/wethrift/issues)
- [Discord Community](https://discord.gg/wethrift)
- [Email Support](mailto:support@wethrift.com)

### Commercial Support
For enterprise support, custom development, and consulting services, contact us at [enterprise@wethrift.com](mailto:enterprise@wethrift.com).

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core platform development
- ✅ USSD integration
- ✅ Web portal
- ✅ Basic mobile app

### Phase 2 (Q2 2024)
- 🔄 Advanced analytics dashboard
- 🔄 AI-powered recommendations
- 🔄 Advanced escrow features
- 🔄 Multi-language support

### Phase 3 (Q3 2024)
- 📋 Blockchain integration
- 📋 Advanced security features
- 📋 Third-party integrations
- 📋 Mobile app enhancements

## 🙏 Acknowledgments

- Nigerian cooperative society regulations and terminology
- Open source community for excellent tools and libraries
- Beta testers and early adopters
- Development team and contributors

---

**Made with ❤️ for Nigerian communities by the WeThrift team**
