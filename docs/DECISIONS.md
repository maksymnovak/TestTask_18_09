# Technical Decisions & Architecture

This document outlines the key technical decisions made during the development of the Capital Marketplace MVP and the reasoning behind each choice.

## 🏗️ Architecture Decisions

### 1. Monorepo Structure
**Decision**: Use npm workspaces for monorepo management
**Reasoning**:
- Simplified dependency management across packages
- Easier code sharing with shared types package
- Better developer experience with unified scripts
- Reduced complexity compared to tools like Lerna

**Alternatives Considered**:
- Separate repositories (rejected: too complex for MVP)
- Lerna/Rush (rejected: overkill for project size)

### 2. Backend Framework
**Decision**: Fastify over Express.js
**Reasoning**:
- Superior performance (2x faster than Express)
- Built-in TypeScript support
- Modern plugin system
- Excellent validation and serialization
- Built-in security features

**Alternatives Considered**:
- Express.js (rejected: slower, more boilerplate)
- Koa.js (rejected: smaller ecosystem)
- NestJS (rejected: too heavyweight for MVP)

### 3. Database Strategy
**Decision**: Prisma ORM with SQLite for development, PostgreSQL for production
**Reasoning**:
- Type-safe database access
- Excellent TypeScript integration
- Automatic migrations
- Built-in connection pooling
- Cross-database compatibility

**Alternatives Considered**:
- TypeORM (rejected: more complex, less type-safe)
- Raw SQL (rejected: no type safety, more boilerplate)
- Mongoose (rejected: document database not needed)

### 4. Frontend Framework
**Decision**: Next.js 14 with App Router
**Reasoning**:
- Server-side rendering for better SEO
- Built-in performance optimizations
- Excellent TypeScript support
- App Router for modern React patterns
- Zero-config deployment options

**Alternatives Considered**:
- Vite + React (rejected: need SSR capabilities)
- Remix (rejected: smaller ecosystem)
- Create React App (rejected: deprecated)

## 🔒 Security Decisions

### 1. Authentication Strategy
**Decision**: Email-based auth for MVP, JWT tokens for production
**Reasoning**:
- Simplified MVP implementation
- Clear migration path to JWT
- Easier testing and development
- Reduced complexity for demo purposes

**Production Recommendation**: Implement JWT with refresh tokens

### 2. File Upload Security
**Decision**: Multi-layer validation approach
**Reasoning**:
- File type validation using `file-type` library
- MIME type checking for client-side uploads
- File size limits to prevent abuse
- Path sanitization to prevent directory traversal

**Implementation**:
```typescript
// Server-side validation
const fileType = await fromBuffer(file.buffer);
if (!ALLOWED_FILE_TYPES.includes(fileType.mime)) {
  throw new Error('File type not allowed');
}
```

### 3. Rate Limiting
**Decision**: Request-based rate limiting with sliding window
**Reasoning**:
- Prevents API abuse
- Protects against DDoS attacks
- Configurable limits per environment
- Memory-efficient implementation

**Configuration**:
- Development: 100 requests/minute
- Production: 1000 requests/minute

## 📊 Data Modeling Decisions

### 1. Investability Scoring Algorithm
**Decision**: Simple additive scoring model
**Reasoning**:
- Transparent and explainable to users
- Easy to modify and extend
- Clear business logic mapping
- Real-time calculation feasibility

**Scoring Breakdown**:
```typescript
const score = {
  kycVerified: 30,      // Binary: 0 or 30
  financialsLinked: 20, // Binary: 0 or 20
  documentsUploaded: 25,// Progressive: 5 per doc, max 25
  revenueScore: 25      // Scaled: 0-25 based on revenue
};
```

### 2. Notification System
**Decision**: Database-stored notifications with real-time capabilities
**Reasoning**:
- Persistent notification history
- Read/unread state tracking
- Scalable with pagination
- Foundation for future WebSocket implementation

**Schema Design**:
- User-scoped notifications
- Type-based categorization
- JSON metadata for extensibility

### 3. Audit Logging
**Decision**: Comprehensive action logging for compliance
**Reasoning**:
- Security requirement for financial platforms
- Debugging and troubleshooting capability
- User action tracking
- Compliance readiness (SOC 2, GDPR)

## 🎨 Frontend Decisions

### 1. Styling Strategy
**Decision**: Tailwind CSS with custom design system
**Reasoning**:
- Rapid prototyping capabilities
- Consistent design language
- Built-in responsive design
- Easy customization and theming

**Custom Additions**:
- Brand color palette
- Animation utilities
- Component-specific styles
- Dark mode preparation

### 2. State Management
**Decision**: TanStack Query + React state
**Reasoning**:
- Excellent server state management
- Built-in caching and synchronization
- Optimistic updates support
- Reduced boilerplate compared to Redux

**Alternatives Considered**:
- Redux Toolkit (rejected: overkill for MVP)
- Zustand (rejected: TanStack Query handles server state better)
- SWR (rejected: less feature-complete than TanStack Query)

### 3. Form Handling
**Decision**: React Hook Form with Zod validation
**Reasoning**:
- Minimal re-renders for performance
- TypeScript integration
- Consistent validation with backend
- Excellent developer experience

**Schema Sharing**:
```typescript
// Shared validation schema
export const CreateCompanyRequestSchema = z.object({
  name: z.string().min(1).max(255),
  sector: z.string().min(1).max(100),
  // ... more fields
});
```

## 🚀 Performance Decisions

### 1. Caching Strategy
**Decision**: Multi-layer caching approach
**Reasoning**:
- API response caching with TanStack Query
- Database query optimization with Prisma
- Static asset caching with Next.js
- Future CDN integration preparation

**Implementation Layers**:
- Browser cache (304 responses)
- TanStack Query cache (5-minute stale time)
- Server-side computation cache (investability scores)

### 2. File Handling
**Decision**: Direct server upload with streaming
**Reasoning**:
- Security control over file processing
- Image optimization capabilities
- Virus scanning preparation
- Cost-effective for MVP scale

**Future Considerations**:
- S3 pre-signed URLs for direct upload
- CDN integration for file delivery
- Image processing pipeline

### 3. Database Optimization
**Decision**: Index strategy and query optimization
**Reasoning**:
- Fast user/company lookups by email
- Efficient document filtering by company
- Optimized notification queries
- Prepared for production scale

## 🧪 Testing Decisions

### 1. Testing Strategy
**Decision**: Focus on backend API testing
**Reasoning**:
- Business logic concentration in backend
- API contract validation critical
- Database interaction testing
- Security validation testing

**Coverage Goals**:
- 80%+ backend code coverage
- All API endpoints tested
- Error scenarios covered
- Edge cases validated

### 2. Testing Tools
**Decision**: Jest with Supertest for API testing
**Reasoning**:
- Excellent TypeScript support
- Fast test execution
- Built-in mocking capabilities
- Industry standard tooling

**Setup**:
```typescript
// Isolated test database per test
afterEach(async () => {
  await db.auditLog.deleteMany();
  await db.company.deleteMany();
  await db.user.deleteMany();
});
```

## 🐳 DevOps Decisions

### 1. Containerization Strategy
**Decision**: Docker with multi-stage builds
**Reasoning**:
- Consistent development/production environments
- Efficient CI/CD pipeline preparation
- Easy local development setup
- Production deployment flexibility

**Optimization Techniques**:
- Multi-stage builds for smaller images
- Layer caching optimization
- Security scanning preparation
- Health check implementation

### 2. Development Environment
**Decision**: Docker Compose for local development
**Reasoning**:
- One-command environment setup
- Service isolation and networking
- Production environment simulation
- Easy onboarding for new developers

**Services**:
- Backend API server
- Frontend Next.js server
- Database backup utility
- Future: Redis, monitoring tools

## 🔮 Future Architectural Considerations

### 1. Microservices Evolution
**Current**: Monolithic API structure
**Future**: Domain-based service separation
- User/Auth service
- Company/KYC service
- Document service
- Notification service

### 2. Event-Driven Architecture
**Current**: Direct database updates
**Future**: Event sourcing with message queues
- Company events (created, verified, updated)
- Document events (uploaded, deleted, scanned)
- User events (registered, verified, notification preferences)

### 3. Real-time Features
**Current**: REST API with polling
**Future**: WebSocket integration
- Real-time notifications
- Live investability score updates
- Collaborative document review
- Chat system integration

### 4. Scalability Improvements
**Current**: Single-instance deployment
**Future**: Multi-instance with load balancing
- Horizontal scaling preparation
- Database read replicas
- CDN integration
- Caching layer (Redis)

## 📋 Decision Trade-offs

### 1. Type Safety vs Development Speed
**Trade-off**: Comprehensive TypeScript everywhere
**Benefit**: Fewer runtime errors, better refactoring
**Cost**: Initial setup complexity, learning curve

### 2. Security vs Simplicity
**Trade-off**: Multiple validation layers
**Benefit**: Production-ready security
**Cost**: More complex request handling

### 3. Features vs Performance
**Trade-off**: Rich feature set with optimizations
**Benefit**: Production-ready MVP
**Cost**: More complex architecture

## 🎯 Success Metrics

### 1. Technical Metrics
- **API Response Time**: < 200ms average
- **Test Coverage**: > 80% backend
- **Bundle Size**: < 500KB gzipped
- **Lighthouse Score**: > 90

### 2. Security Metrics
- **Vulnerability Scan**: 0 critical issues
- **Security Headers**: A+ grade
- **File Upload**: 100% validation coverage
- **Audit Coverage**: All critical actions logged

### 3. Developer Experience
- **Setup Time**: < 10 minutes
- **Hot Reload**: < 1 second
- **Type Safety**: 100% TypeScript coverage
- **Documentation**: Complete API docs
