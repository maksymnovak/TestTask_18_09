import { FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { db } from '@/config/database';
import { v4 as uuid } from 'uuid';

describe('Company Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/company', () => {
    it('should create a new company successfully', async () => {
      const companyData = {
        name: 'Test Company',
        sector: 'Technology',
        targetRaise: 1000000,
        revenue: 500000,
        email: 'test@example.com',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: companyData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: companyData.name,
        sector: companyData.sector,
        targetRaise: companyData.targetRaise,
        revenue: companyData.revenue,
        kycVerified: false,
        financialsLinked: false,
      });
      expect(body.data.id).toBeDefined();
      expect(body.data.userId).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        sector: 'Technology',
        targetRaise: -1000, // Negative raise should fail
        revenue: 500000,
        email: 'invalid-email', // Invalid email format
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('should prevent duplicate company creation for same user', async () => {
      const companyData = {
        name: 'First Company',
        sector: 'Technology',
        targetRaise: 1000000,
        revenue: 500000,
        email: 'duplicate@example.com',
      };

      // Create first company
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: companyData,
      });

      expect(firstResponse.statusCode).toBe(201);

      // Try to create second company with same email
      const secondCompanyData = {
        ...companyData,
        name: 'Second Company',
      };

      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: secondCompanyData,
      });

      expect(secondResponse.statusCode).toBe(409);

      const body = JSON.parse(secondResponse.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('User already has a company registered');
    });
  });

  describe('GET /api/company/:id', () => {
    let companyId: string;
    let userEmail: string;

    beforeEach(async () => {
      userEmail = 'get-test@example.com';
      const companyData = {
        name: 'Get Test Company',
        sector: 'Healthcare',
        targetRaise: 2000000,
        revenue: 800000,
        email: userEmail,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: companyData,
      });

      const body = JSON.parse(response.body);
      companyId = body.data.id;
    });

    it('should retrieve company by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/company/${companyId}?email=${userEmail}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        id: companyId,
        name: 'Get Test Company',
        sector: 'Healthcare',
        targetRaise: 2000000,
        revenue: 800000,
      });
    });

    it('should return 404 for non-existent company', async () => {
      const fakeId = uuid();
      const response = await app.inject({
        method: 'GET',
        url: `/api/company/${fakeId}?email=${userEmail}`,
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Company not found');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/company/invalid-uuid?email=${userEmail}`,
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid company ID');
    });

    it('should return 400 for missing email', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/company/${companyId}`,
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Valid email is required');
    });
  });

  describe('GET /api/company/by-email/:email', () => {
    let userEmail: string;

    beforeEach(async () => {
      userEmail = 'by-email-test@example.com';
      const companyData = {
        name: 'Email Test Company',
        sector: 'Finance',
        targetRaise: 1500000,
        revenue: 300000,
        email: userEmail,
      };

      await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: companyData,
      });
    });

    it('should retrieve company by user email', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/company/by-email/${userEmail}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Email Test Company',
        sector: 'Finance',
        targetRaise: 1500000,
        revenue: 300000,
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/company/by-email/nonexistent@example.com',
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('User not found');
    });
  });

  describe('PUT /api/company/:id', () => {
    let companyId: string;

    beforeEach(async () => {
      const companyData = {
        name: 'Update Test Company',
        sector: 'Technology',
        targetRaise: 1000000,
        revenue: 400000,
        email: 'update-test@example.com',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/company',
        payload: companyData,
      });

      const body = JSON.parse(response.body);
      companyId = body.data.id;
    });

    it('should update company successfully', async () => {
      const updateData = {
        name: 'Updated Company Name',
        revenue: 600000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/company/${companyId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Company Name');
      expect(body.data.revenue).toBe(600000);
    });

    it('should return 404 for non-existent company', async () => {
      const fakeId = uuid();
      const updateData = {
        name: 'Updated Name',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/company/${fakeId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Company not found');
    });
  });
});