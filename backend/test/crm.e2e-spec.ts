import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { TenantRegistry } from '../src/tenancy/tenant.registry';
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
  describe('client property inventory', () => {
    let propertyId: string;
    let imageId: string;

    it('stores the full listing and owner details', async () => {
      const response = await http.post('/api/properties').set(auth(adminToken)).send({
        title: 'Client-ready apartment', bedrooms: 3, bathrooms: 2, balconies: 1,
        parkingSpaces: 1, floorNumber: 4, totalFloors: 8, furnishing: 'Semi-furnished',
        possessionStatus: 'Ready to move', facing: 'East', reraNumber: 'TEST-RERA-001',
        ownerName: 'Listing Owner', ownerPhone: '9999999999', amenities: 'Lift, security',
      }).expect(201);
      propertyId = response.body.id;
      expect(response.body).toMatchObject({ bathrooms: 2, floorNumber: 4, ownerName: 'Listing Owner', furnishing: 'Semi-furnished' });
      await http.patch(`/api/properties/${propertyId}`).set(auth(adminToken)).send({ bathrooms: -1 }).expect(400);
      await http.patch(`/api/properties/${propertyId}`).set(auth(adminToken)).send({ furnishing: 'unknown' }).expect(400);
    });

    it('accepts multiple photos, serves them and sets a cover', async () => {
      const uploaded = await http.post(`/api/properties/${propertyId}/images`).set(auth(adminToken))
        .attach('files', PNG, 'living-room.png').attach('files', PNG, 'bedroom.png').expect(201);
      expect(uploaded.body.images).toHaveLength(2);
      imageId = uploaded.body.images[1].id;
      await http.get(uploaded.body.images[0].url).expect(200).expect('Content-Type', /image\/png/);
      const reordered = await http.put(`/api/properties/${propertyId}/images/order`).set(auth(adminToken)).send({ imageIds: [imageId] }).expect(200);
      expect(reordered.body.images[0].id).toBe(imageId);
      await http.put(`/api/properties/${propertyId}/images/order`).set(auth(adminToken)).send({ imageIds: [imageId, imageId] }).expect(400);
    });

    it('enforces the gallery cap when two uploads arrive together', async () => {
      const before = await http.get(`/api/properties/${propertyId}`).set(auth(adminToken)).expect(200);
      const upload = () => {
        let req = http.post(`/api/properties/${propertyId}/images`).set(auth(adminToken));
        for (let i = 0; i < 10; i++) req = req.attach('files', PNG, `room-${i}.png`);
        return req;
      };
      const results = await Promise.all([upload(), upload()]);
      expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
      const after = await http.get(`/api/properties/${propertyId}`).set(auth(adminToken)).expect(200);
      expect(after.body.images).toHaveLength(before.body.images.length + 10);
      const originalIds = new Set(before.body.images.map((image: { id: string }) => image.id));
      for (const image of after.body.images) {
        if (!originalIds.has(image.id)) await http.delete(`/api/properties/${propertyId}/images/${image.id}`).set(auth(adminToken)).expect(200);
      }
    });

    it('removes a photo and preserves the listing details', async () => {
      const response = await http.delete(`/api/properties/${propertyId}/images/${imageId}`).set(auth(adminToken)).expect(200);
      expect(response.body.images).toHaveLength(1);
      expect(response.body.ownerName).toBe('Listing Owner');
      await http.delete(`/api/properties/${propertyId}`).set(auth(adminToken)).expect(204);
    });

    it('blocks public registration when the deployment disables it', async () => {
      const config = app.get(ConfigService);
      config.set('REGISTRATION_ENABLED', 'false');
      try {
        const options = await http.get('/api/auth/options').expect(200);
        expect(options.body.registrationEnabled).toBe(false);
        await http.post('/api/auth/register').send({ name: 'Uninvited User', email: 'uninvited@test.local', password: 'Password1' }).expect(403);
      } finally { config.set('REGISTRATION_ENABLED', 'true'); }
    });

    it('exposes only company name and tagline in public branding', async () => {
      const response = await http.get('/api/settings/branding').expect(200);
      expect(Object.keys(response.body).sort()).toEqual(['companyName', 'tagline']);
    });
  });

  describe('master administration and client isolation', () => {
    let masterToken: string;
    let clientA: { id: string; slug: string; schemaName: string };
    let clientB: { id: string; slug: string; schemaName: string };
    let tokenA: string;
    let tokenB: string;
    let contactA: string;
    let propertyA: string;
    let photoUrl: string;
    let documentA: string;
    const owner = { email: 'owner@client.test', password: 'ClientPassword123' };
    const allFeatures = ['dashboard', 'leads', 'properties', 'photos', 'deals', 'visits', 'tasks', 'communications', 'marketing', 'team', 'reports', 'documents', 'brochures'];

    beforeAll(async () => {
      await app.get(DataSource).query('INSERT INTO public.platform_admins (name,email,"passwordHash") VALUES ($1,$2,$3)', ['Test Master', 'master@test.local', await bcrypt.hash('MasterPassword123', 12)]);
      const login = await http.post('/api/platform/auth/login').send({ email: 'master@test.local', password: 'MasterPassword123' }).expect(200);
      masterToken = login.body.accessToken;
    });
    afterAll(async () => {
      for (const client of [clientA, clientB]) {
        if (client && /^tenant_[a-f0-9]{32}$/.test(client.schemaName)) {
          await app.get(TenantRegistry).closeClient(client.id);
          await app.get(DataSource).query(`DROP SCHEMA IF EXISTS "${client.schemaName}" CASCADE`);
        }
      }
    });
    it('allows only master sessions to manage clients', async () => {
      await http.get('/api/platform/clients').expect(401);
      await http.get('/api/platform/clients').set(auth(adminToken)).expect(401);
      await http.get('/api/platform/me').set(auth(masterToken)).expect(200);
    });
    it('provisions separate workspaces with the same owner email', async () => {
      const create = (slug: string) => http.post('/api/platform/clients').set(auth(masterToken)).send({ name: slug, slug, ownerEmail: owner.email, ownerPassword: owner.password, maxImages: 2 });
      clientA = (await create('client-alpha').expect(201)).body;
      clientB = (await create('client-beta').expect(201)).body;
      expect(clientA.schemaName).not.toBe(clientB.schemaName);
      const loginA = await http.post('/api/auth/login').send({ ...owner, workspace: clientA.slug }).expect(200);
      const loginB = await http.post('/api/auth/login').send({ ...owner, workspace: clientB.slug }).expect(200);
      tokenA = loginA.body.accessToken;
      tokenB = loginB.body.accessToken;
      expect(loginA.body.user.id).not.toBe(loginB.body.user.id);
      expect(loginA.body.user.passwordHash).toBeUndefined();
    });
    it('isolates records, dropdowns, updates and raw dashboard queries', async () => {
      const created = await http.post('/api/contacts').set(auth(tokenA)).send({ name: 'Alpha private lead' }).expect(201);
      contactA = created.body.id;
      const property = await http.post('/api/properties').set(auth(tokenA)).send({ title: 'Alpha private property', ownerName: 'Alpha owner' }).expect(201);
      propertyA = property.body.id;
      await http.get('/api/contacts?workspace=client-alpha').set(auth(tokenB)).expect(400);
      const list = await http.get('/api/contacts').set('X-Workspace', 'client-alpha').set(auth(tokenB)).expect(200);
      expect(list.body.total).toBe(0);
      await http.get(`/api/contacts/${contactA}`).set(auth(tokenB)).expect(404);
      await http.patch(`/api/contacts/${contactA}`).set(auth(tokenB)).send({ name: 'Cross-client edit' }).expect(404);
      await http.delete(`/api/contacts/${contactA}`).set(auth(tokenB)).expect(404);
      const options = await http.get('/api/properties/options').set(auth(tokenB)).expect(200);
      expect(options.body).toEqual([]);
      const dashboardA = await http.get('/api/reports/dashboard').set(auth(tokenA)).expect(200);
      const dashboardB = await http.get('/api/reports/dashboard').set(auth(tokenB)).expect(200);
      expect(dashboardA.body.kpis.totalLeads).toBe(1);
      expect(dashboardB.body.kpis.totalLeads).toBe(0);
      const users = await http.get('/api/users/options').set(auth(tokenB)).expect(200);
      expect(users.body).toHaveLength(1);
    });
    it('isolates uploads and enforces the master photo allowance', async () => {
      const uploaded = await http.post(`/api/properties/${propertyA}/images`).set(auth(tokenA)).attach('files', PNG, 'one.png').attach('files', PNG, 'two.png').expect(201);
      photoUrl = uploaded.body.images[0].url;
      expect(photoUrl).toContain('workspace=client-alpha');
      await http.get(photoUrl).expect(200);
      await http.get(photoUrl.replace('client-alpha', 'client-beta')).expect(404);
      await http.post(`/api/properties/${propertyA}/images`).set(auth(tokenA)).attach('files', PNG, 'third.png').expect(400);
      const doc = await http.post('/api/documents').set(auth(tokenA)).field('category', 'Agreement').attach('file', PDF, { filename: 'private.pdf', contentType: 'application/pdf' }).expect(201);
      documentA = doc.body.id;
      await http.get(`/api/documents/${documentA}/download`).set(auth(tokenB)).expect(404);
      await http.get(`/api/documents/${documentA}/download`).set(auth(tokenA)).expect(200);
    });
    it('blocks disabled modules on the API and updates client metadata', async () => {
      await http.patch(`/api/platform/clients/${clientA.id}`).set(auth(masterToken)).send({ features: allFeatures.filter((key) => !['leads','photos','documents'].includes(key)) }).expect(200);
      await http.get('/api/contacts').set(auth(tokenA)).expect(403);
      await http.get('/api/contacts/options').set(auth(tokenA)).expect(403);
      await http.get(`/api/documents/${documentA}/download`).set(auth(tokenA)).expect(403);
      await http.get(photoUrl).expect(403);
      const meta = await http.get('/api/settings/meta').set(auth(tokenA)).expect(200);
      expect(meta.body.features.leads).toBe(false);
      expect(meta.body.maxImagesPerProperty).toBe(2);
      await http.patch(`/api/platform/clients/${clientA.id}`).set(auth(masterToken)).send({ features: allFeatures }).expect(200);
    });
    it('suspends existing client sessions and login immediately', async () => {
      await http.patch(`/api/platform/clients/${clientA.id}`).set(auth(masterToken)).send({ isActive: false }).expect(200);
      await http.get('/api/contacts').set(auth(tokenA)).expect(403);
      await http.post('/api/auth/login').send({ ...owner, workspace: clientA.slug }).expect(401);
      await http.patch(`/api/platform/clients/${clientA.id}`).set(auth(masterToken)).send({ isActive: true }).expect(200);
    });
    it('resets owner credentials and audits master workspace access', async () => {
      await http.post(`/api/platform/clients/${clientA.id}/password`).set(auth(masterToken)).send({ password: 'UpdatedPassword123' }).expect(201);
      await http.post('/api/auth/login').send({ ...owner, workspace: clientA.slug }).expect(401);
      await http.post('/api/auth/login').send({ email: owner.email, password: 'UpdatedPassword123', workspace: clientA.slug }).expect(200);
      const opened = await http.post(`/api/platform/clients/${clientA.id}/open`).set(auth(masterToken)).expect(201);
      const contacts = await http.get('/api/contacts').set(auth(opened.body.accessToken)).expect(200);
      expect(contacts.body.total).toBe(1);
      const history = await http.get('/api/platform/audit').set(auth(masterToken)).expect(200);
      expect(history.body.some((item: { action: string }) => item.action === 'workspace.opened_by_master')).toBe(true);
    });

    it('protects the primary owner and keeps master credential controls in sync', async () => {
      const session = await http.post('/api/platform/clients/' + clientA.id + '/open').set(auth(masterToken)).expect(201);
      const ownerToken = session.body.accessToken;
      const ownerUser = await http.get('/api/users/me').set(auth(ownerToken)).expect(200);
      await http.post('/api/users').set(auth(ownerToken)).send({ name: 'Second Admin', email: 'second@client.test', password: 'SecondPassword123', role: 'ADMIN' }).expect(201);
      const second = await http.post('/api/auth/login').send({ email: 'second@client.test', password: 'SecondPassword123', workspace: clientA.slug }).expect(200);
      await http.patch(`/api/users/${ownerUser.body.id}`).set(auth(second.body.accessToken)).send({ role: 'AGENT' }).expect(400);
      await http.delete(`/api/users/${ownerUser.body.id}`).set(auth(second.body.accessToken)).expect(400);
      await http.patch(`/api/users/${ownerUser.body.id}`).set(auth(ownerToken)).send({ email: 'new-owner@client.test' }).expect(200);
      const clients = await http.get('/api/platform/clients').set(auth(masterToken)).expect(200);
      expect(clients.body.find((client: { id: string }) => client.id === clientA.id).ownerEmail).toBe('new-owner@client.test');
      await http.post(`/api/platform/clients/${clientA.id}/open`).set(auth(masterToken)).expect(201);
      await http.get('/api/platform/clients').set(auth(second.body.accessToken)).expect(401);
    });
  });

});
