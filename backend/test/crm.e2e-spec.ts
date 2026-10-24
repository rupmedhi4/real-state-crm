import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const PDF = Buffer.from('%PDF-1.4\n%%EOF');

describe('Estateflow CRM (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let adminToken: string;
  let agentToken: string;
  let agentId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    // Fresh schema for every run.
    const ds = app.get(DataSource);
    await ds.dropDatabase();
    await ds.runMigrations();

    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('makes the first registered user an admin and later ones agents', async () => {
      const admin = await http
        .post('/api/auth/register')
        .send({
          name: 'Test Admin',
          email: 'admin@test.local',
          password: 'Password1',
        })
        .expect(201);
      expect(admin.body.user.role).toBe('ADMIN');
      expect(admin.body.user.passwordHash).toBeUndefined();
      adminToken = admin.body.accessToken;

      const agent = await http
        .post('/api/auth/register')
        .send({
          name: 'Test Agent',
          email: 'agent@test.local',
          password: 'Password1',
        })
        .expect(201);
      expect(agent.body.user.role).toBe('AGENT');
      agentToken = agent.body.accessToken;
      agentId = agent.body.user.id;
    });

    it('rejects duplicate emails, bad passwords and missing tokens', async () => {
      await http
        .post('/api/auth/register')
        .send({ name: 'Dup', email: 'ADMIN@test.local', password: 'Password1' })
        .expect(409);
      await http
        .post('/api/auth/login')
        .send({ email: 'admin@test.local', password: 'wrong-password' })
        .expect(401);
      await http.get('/api/contacts').expect(401);
      await http.get('/api/contacts').set(auth('not-a-jwt')).expect(401);
    });

    it('logs in with valid credentials', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: 'admin@test.local', password: 'Password1' })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });
  });

  describe('leads, clients and history', () => {
    let leadId: string;

    it('validates input', async () => {
      const res = await http
        .post('/api/contacts')
        .set(auth(adminToken))
        .send({ name: '', stage: 'Nope', unknownField: 1 })
        .expect(400);
      expect(res.body.message).toEqual(expect.any(Array));
    });

    it('creates a lead with a first note', async () => {
      const res = await http
        .post('/api/contacts')
        .set(auth(adminToken))
        .send({
          name: 'Rahul Sharma',
          phone: '9876543210',
          source: '99acres',
          budgetMax: 5500000,
          note: 'Wants a park-facing flat',
        })
        .expect(201);
      leadId = res.body.id;
      expect(res.body.stage).toBe('New');
      expect(res.body.budgetMax).toBe(5500000);
    });

    it('assigns the lead and changes its stage, logging both', async () => {
      await http
        .patch(`/api/contacts/${leadId}/assign`)
        .set(auth(adminToken))
        .send({ agentId })
        .expect(200);
      const res = await http
        .patch(`/api/contacts/${leadId}/stage`)
        .set(auth(adminToken))
        .send({ stage: 'Qualified' })
        .expect(200);
      expect(res.body.agent.id).toBe(agentId);

      const history = await http
        .get(`/api/activities?contactId=${leadId}`)
        .set(auth(adminToken))
        .expect(200);
      const types = history.body.items.map((a: { type: string }) => a.type);
      expect(types).toEqual(expect.arrayContaining(['Note', 'Status Change']));
    });

    it('stops agents from reassigning leads', async () => {
      await http
        .patch(`/api/contacts/${leadId}/assign`)
        .set(auth(agentToken))
        .send({ agentId: null })
        .expect(403);
    });

    it('searches, filters and paginates', async () => {
      for (let i = 0; i < 4; i++) {
        await http
          .post('/api/contacts')
          .set(auth(adminToken))
          .send({ name: `Bulk Lead ${i}`, source: 'Website' })
          .expect(201);
      }
      const page = await http
        .get(
          '/api/contacts?source=Website&limit=2&page=2&sortBy=name&sortOrder=ASC',
        )
        .set(auth(adminToken))
        .expect(200);
      expect(page.body.total).toBe(4);
      expect(page.body.totalPages).toBe(2);
      expect(page.body.items.map((c: { name: string }) => c.name)).toEqual([
        'Bulk Lead 2',
        'Bulk Lead 3',
      ]);

      const search = await http
        .get('/api/contacts?search=rahul')
        .set(auth(adminToken))
        .expect(200);
      expect(search.body.total).toBe(1);

      const clients = await http
        .get('/api/contacts?clientsOnly=true')
        .set(auth(adminToken))
        .expect(200);
      expect(clients.body.items.map((c: { id: string }) => c.id)).toEqual([
        leadId,
      ]);
    });

    it('persists records across requests', async () => {
      const res = await http
        .get(`/api/contacts/${leadId}`)
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.name).toBe('Rahul Sharma');
      expect(res.body.stage).toBe('Qualified');
    });
  });

  describe('properties, deals, visits and tasks', () => {
    let contactId: string;
    let propertyId: string;
    let dealId: string;

    beforeAll(async () => {
      const c = await http
        .post('/api/contacts')
        .set(auth(adminToken))
        .send({ name: 'Manoj Baruah', stage: 'Negotiation' });
      contactId = c.body.id;
    });

    it('creates a property with multiple images', async () => {
      const p = await http
        .post('/api/properties')
        .set(auth(adminToken))
        .send({ title: 'GS Road Shop', listingType: 'Rent', price: 45000 })
        .expect(201);
      propertyId = p.body.id;

      const res = await http
        .post(`/api/properties/${propertyId}/images`)
        .set(auth(adminToken))
        .attach('files', PNG, {
          filename: 'front.png',
          contentType: 'image/png',
        })
        .attach('files', PNG, {
          filename: 'inside.png',
          contentType: 'image/png',
        })
        .expect(201);
      expect(res.body.images).toHaveLength(2);
      expect(res.body.images[0].storageKey).toBeUndefined();

      // Images are publicly viewable by URL.
      await http
        .get(res.body.images[0].url)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });

    it('rejects files whose content does not match their type', async () => {
      await http
        .post(`/api/properties/${propertyId}/images`)
        .set(auth(adminToken))
        .attach('files', Buffer.from('<script>'), {
          filename: 'x.png',
          contentType: 'image/png',
        })
        .expect(400);
    });

    it('links a deal to a client and property and computes commission', async () => {
      const res = await http
        .post('/api/deals')
        .set(auth(adminToken))
        .send({
          contactId,
          propertyId,
          value: 1000000,
          commissionPct: 2.5,
          stage: 'Offer',
        })
        .expect(201);
      dealId = res.body.id;
      expect(res.body.contact.name).toBe('Manoj Baruah');
      expect(res.body.property.title).toBe('GS Road Shop');
      expect(res.body.commissionAmount).toBe(25000);

      const won = await http
        .patch(`/api/deals/${dealId}/stage`)
        .set(auth(adminToken))
        .send({ stage: 'Won' })
        .expect(200);
      expect(won.body.closedAt).not.toBeNull();
    });

    it('refuses to delete a client that has deals', async () => {
      await http
        .delete(`/api/contacts/${contactId}`)
        .set(auth(adminToken))
        .expect(409);
    });

    it('schedules a visit with a follow-up task', async () => {
      await http
        .post('/api/visits')
        .set(auth(agentToken))
        .send({
          contactId,
          propertyId,
          visitDate: '2030-01-10',
          visitTime: '10:30',
          createFollowupTask: true,
        })
        .expect(201);

      const tasks = await http
        .get(`/api/tasks?contactId=${contactId}`)
        .set(auth(agentToken))
        .expect(200);
      expect(tasks.body.items).toHaveLength(1);
      expect(tasks.body.items[0].dueDate).toBe('2030-01-11');
      expect(tasks.body.items[0].assignee.id).toBe(agentId);

      const done = await http
        .patch(`/api/tasks/${tasks.body.items[0].id}/complete`)
        .set(auth(agentToken))
        .expect(200);
      expect(done.body.status).toBe('Completed');
    });

    it('rejects an invalid visit time', async () => {
      await http
        .post('/api/visits')
        .set(auth(agentToken))
        .send({ contactId, visitDate: '2030-01-10', visitTime: '25:99' })
        .expect(400);
    });

    it('reports figures from real records', async () => {
      const summary = await http
        .get('/api/deals/summary')
        .set(auth(adminToken))
        .expect(200);
      expect(summary.body.won).toBe(1);
      expect(summary.body.revenue).toBe(1000000);

      const dash = await http
        .get('/api/reports/dashboard')
        .set(auth(adminToken))
        .expect(200);
      expect(dash.body.kpis.closedDeals).toBe(1);
      expect(dash.body.kpis.totalLeads).toBeGreaterThanOrEqual(6);
    });
  });

  describe('documents and permissions', () => {
    it('keeps documents behind authentication', async () => {
      const up = await http
        .post('/api/documents')
        .set(auth(adminToken))
        .field('category', 'Agreement')
        .attach('file', PDF, {
          filename: 'sale.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      expect(up.body.storageKey).toBeUndefined();

      await http.get(`/api/documents/${up.body.id}/download`).expect(401);
      await http
        .get(`/api/documents/${up.body.id}/download`)
        .set(auth(agentToken))
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
    });

    it('enforces role-based access', async () => {
      await http
        .put('/api/settings')
        .set(auth(agentToken))
        .send({ companyName: 'Nope' })
        .expect(403);
      await http
        .put('/api/settings')
        .set(auth(adminToken))
        .send({ companyName: 'Test Realty' })
        .expect(200);
      const s = await http
        .get('/api/settings')
        .set(auth(agentToken))
        .expect(200);
      expect(s.body.companyName).toBe('Test Realty');
    });

    it('locks out deactivated users immediately', async () => {
      await http
        .patch(`/api/users/${agentId}`)
        .set(auth(adminToken))
        .send({ isActive: false })
        .expect(200);
      await http.get('/api/contacts').set(auth(agentToken)).expect(401);
    });
  });
});
