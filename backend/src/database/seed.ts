/**
 * Development seed data, ported from the legacy Estateflow demo.
 *
 *   npm run seed          -> only seeds an empty database
 *   npm run seed -- --reset  -> wipes all CRM data first (dev only!)
 *   npm run seed -- --empty  -> only the admin login, no demo records
 *   npm run db:clean      -> wipe everything, keep only the admin login
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Activity } from '../communications/activity.entity';
import { Role } from '../common/constants';
import { Contact } from '../contacts/contact.entity';
import { Deal } from '../deals/deal.entity';
import { Campaign } from '../marketing/campaign.entity';
import { Property } from '../properties/property.entity';
import { Setting } from '../settings/setting.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';
import { Visit } from '../visits/visit.entity';
import { dbOptions } from './db-options';

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function run() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database');
  }
  const reset = process.argv.includes('--reset');
  const empty = process.argv.includes('--empty');
  const ds = await new DataSource(dbOptions()).initialize();

  try {
    if (reset) {
      await ds.query(
        `TRUNCATE documents, activities, tasks, site_visits, deals, property_images,
                  properties, contacts, campaigns, settings, users RESTART IDENTITY CASCADE`,
      );
      console.log('Existing data cleared.');
    } else if ((await ds.getRepository(User).count()) > 0) {
      console.log(
        'Database already has users; skipping seed (use --reset to start over).',
      );
      return;
    }

    await ds.transaction(async (em) => {
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
      const agentPassword = process.env.SEED_AGENT_PASSWORD || 'Agent@12345';
      const [adminHash, agentHash] = await Promise.all([
        bcrypt.hash(adminPassword, 12),
        bcrypt.hash(agentPassword, 12),
      ]);

      const admin = await em.save(User, {
        name: 'Admin',
        email: (
          process.env.SEED_ADMIN_EMAIL || 'admin@estateflow.local'
        ).toLowerCase(),
        role: Role.ADMIN,
        designation: 'Admin',
        passwordHash: adminHash,
      });

      if (empty) {
        console.log('Admin login created (no demo data).');
        console.log(`  Admin:   ${admin.email} / ${adminPassword}`);
        return;
      }

      const [amit, simran] = await em.save(User, [
        {
          name: 'Amit Kalita',
          email: 'amit@estateflow.local',
          phone: '9864000001',
          role: Role.MANAGER,
          designation: 'Senior Agent',
          passwordHash: agentHash,
        },
        {
          name: 'Simran Kaur',
          email: 'simran@estateflow.local',
          phone: '9864000002',
          role: Role.AGENT,
          designation: 'Agent',
          passwordHash: agentHash,
        },
      ]);

      const [portal, fbAds] = await em.save(Campaign, [
        {
          name: '99acres Premium Listing Q4',
          source: '99acres',
          startDate: day(-30),
          budget: 25000,
          status: 'Active',
        },
        {
          name: 'Diwali Facebook Push',
          source: 'Facebook/Instagram Ads',
          startDate: day(-14),
          endDate: day(14),
          budget: 40000,
          status: 'Active',
        },
      ]);

      const [p1, p2, p3] = await em.save(Property, [
        {
          title: 'Green Valley 3BHK',
          listingType: 'Sale',
          category: 'Residential',
          propertyType: 'Apartment',
          price: 5000000,
          bedrooms: 3,
          areaSqft: 1450,
          city: 'Guwahati',
          locality: 'Zoo Road',
          status: 'Available',
          agentId: amit.id,
          description: 'Spacious 3BHK with park view.',
        },
        {
          title: 'Riverside Villa',
          listingType: 'Sale',
          category: 'Residential',
          propertyType: 'Villa',
          price: 12000000,
          bedrooms: 4,
          areaSqft: 2800,
          city: 'Guwahati',
          locality: 'Dispur',
          status: 'Under Offer',
          agentId: simran.id,
          description: 'Premium riverside villa.',
        },
        {
          title: 'GS Road Commercial Shop',
          listingType: 'Rent',
          category: 'Commercial',
          propertyType: 'Shop',
          price: 45000,
          bedrooms: 0,
          areaSqft: 600,
          city: 'Guwahati',
          locality: 'GS Road',
          status: 'Available',
          agentId: amit.id,
          description: 'High footfall commercial space.',
        },
      ]);

      const [rahul, priya, manoj, anjali] = await em.save(Contact, [
        {
          name: 'Rahul Sharma',
          phone: '9876543210',
          whatsapp: '9876543210',
          email: 'rahul.sharma@example.com',
          city: 'Guwahati',
          address: 'Zoo Road',
          source: '99acres',
          campaignId: portal.id,
          propertyInterest: '3BHK Flat, Guwahati',
          propertyCategory: 'Residential',
          intent: 'Buy',
          configuration: '3BHK',
          budgetMin: 4000000,
          budgetMax: 5500000,
          stage: 'Site Visit',
          priority: 'High',
          agentId: amit.id,
          nextFollowup: day(0),
          score: 72,
          preferences: 'Park-facing, near school, covered parking',
        },
        {
          name: 'Priya Das',
          phone: '9123456780',
          whatsapp: '9123456780',
          email: 'priya.das@example.com',
          city: 'Guwahati',
          address: 'Dispur',
          source: 'MagicBricks',
          propertyInterest: '2BHK Flat, Dispur',
          propertyCategory: 'Residential',
          intent: 'Buy',
          configuration: '2BHK',
          budgetMin: 2500000,
          budgetMax: 3200000,
          stage: 'New',
          priority: 'Medium',
          agentId: simran.id,
          score: 45,
        },
        {
          name: 'Manoj Baruah',
          phone: '9988776655',
          whatsapp: '9988776655',
          email: 'manoj.b@example.com',
          city: 'Guwahati',
          address: 'Beltola',
          source: 'Referral',
          propertyInterest: 'Commercial Shop, GS Road',
          propertyCategory: 'Commercial',
          intent: 'Buy',
          budgetMin: 10000000,
          budgetMax: 13000000,
          stage: 'Negotiation',
          priority: 'High',
          agentId: amit.id,
          score: 81,
        },
        {
          name: 'Anjali Bora',
          phone: '9435012345',
          email: 'anjali.bora@example.com',
          city: 'Guwahati',
          source: 'Facebook/Instagram Ads',
          campaignId: fbAds.id,
          propertyInterest: 'Villa, Dispur',
          propertyCategory: 'Residential',
          intent: 'Buy',
          configuration: '4BHK',
          budgetMin: 10000000,
          budgetMax: 12500000,
          stage: 'Won',
          priority: 'High',
          agentId: simran.id,
          score: 95,
        },
        {
          name: 'Deepak Gogoi',
          phone: '9707012345',
          city: 'Guwahati',
          source: 'Walk-in',
          propertyInterest: 'Office space for rent',
          propertyCategory: 'Commercial',
          intent: 'Rent',
          stage: 'Contacted',
          priority: 'Low',
          agentId: simran.id,
          nextFollowup: day(-1),
          score: 35,
        },
      ]);

      await em.save(Deal, [
        {
          title: 'GS Road shop purchase',
          contactId: manoj.id,
          propertyId: p3.id,
          value: 9500000,
          expectedClosing: day(23),
          stage: 'Negotiation',
          probability: 65,
          agentId: amit.id,
          commissionPct: 2,
          transactionStatus: 'Not Started',
        },
        {
          title: 'Green Valley 3BHK',
          contactId: rahul.id,
          propertyId: p1.id,
          value: 5200000,
          expectedClosing: day(33),
          stage: 'Qualified',
          probability: 40,
          agentId: amit.id,
          commissionPct: 2,
          transactionStatus: 'Not Started',
        },
        {
          title: 'Riverside Villa sale',
          contactId: anjali.id,
          propertyId: p2.id,
          value: 11800000,
          expectedClosing: day(-5),
          stage: 'Won',
          probability: 100,
          agentId: simran.id,
          commissionPct: 1.5,
          transactionStatus: 'Agreement Signed',
          closedAt: new Date(),
        },
      ]);

      await em.save(Visit, [
        {
          contactId: rahul.id,
          propertyId: p1.id,
          visitDate: day(1),
          visitTime: '11:00',
          agentId: amit.id,
          status: 'Scheduled',
        },
        {
          contactId: anjali.id,
          propertyId: p2.id,
          visitDate: day(-12),
          visitTime: '16:00',
          agentId: simran.id,
          status: 'Completed',
          feedback: 'Loved the river view; asked about possession date.',
        },
      ]);

      await em.save(Task, [
        {
          title: 'Follow-up call for loan status',
          contactId: priya.id,
          type: 'Call',
          priority: 'High',
          dueDate: day(0),
          dueTime: '15:00',
          assigneeId: simran.id,
          status: 'Pending',
        },
        {
          title: 'Send shop brochure',
          contactId: manoj.id,
          type: 'Document',
          priority: 'Medium',
          dueDate: day(1),
          assigneeId: amit.id,
          status: 'Pending',
        },
        {
          title: 'Collect ID documents',
          contactId: anjali.id,
          type: 'Document',
          priority: 'Medium',
          dueDate: day(-2),
          assigneeId: simran.id,
          status: 'Pending',
        },
      ]);

      const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
      await em.save(Activity, [
        {
          contactId: rahul.id,
          type: 'Note',
          notes: 'Site visit next weekend ke liye schedule karna hai.',
          agentId: amit.id,
          occurredAt: hoursAgo(72),
        },
        {
          contactId: priya.id,
          type: 'Note',
          notes: 'Loan pre-approval abhi pending hai.',
          agentId: simran.id,
          occurredAt: hoursAgo(48),
        },
        {
          contactId: rahul.id,
          type: 'Call',
          outcome: 'Interested',
          notes: 'Site visit ke liye confirm kiya.',
          agentId: amit.id,
          occurredAt: hoursAgo(1),
        },
        {
          contactId: manoj.id,
          type: 'Meeting',
          outcome: 'Follow-up Scheduled',
          notes: 'Price negotiation discuss hui.',
          agentId: amit.id,
          occurredAt: hoursAgo(2),
        },
      ]);

      await em.save(Setting, [
        { key: 'companyName', value: 'Estateflow Realty' },
        { key: 'tagline', value: 'Trusted property partners in Guwahati' },
      ]);

      console.log('Seed complete.');
      console.log(`  Admin:   ${admin.email} / ${adminPassword}`);
      console.log(`  Manager: ${amit.email} / ${agentPassword}`);
      console.log(`  Agent:   ${simran.email} / ${agentPassword}`);
    });
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
