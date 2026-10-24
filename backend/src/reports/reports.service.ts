import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LEAD_STAGES } from '../common/constants';

const num = (v: unknown) => Number(v ?? 0);

type Row = Record<string, unknown>;

/** Read-only aggregates computed directly from the database. */
@Injectable()
export class ReportsService {
  constructor(private readonly db: DataSource) {}

  /** Raw SQL returning typed rows (pg returns COUNT/SUM as strings). */
  private q<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.db.query<T[]>(sql, params);
  }

  async dashboard() {
    const [kpi] = await this.q(`
      SELECT
        (SELECT COUNT(*) FROM contacts) AS "totalLeads",
        (SELECT COUNT(*) FROM contacts WHERE "createdAt"::date = CURRENT_DATE) AS "newToday",
        (SELECT COUNT(*) FROM contacts WHERE stage = 'Qualified') AS "qualifiedLeads",
        (SELECT COUNT(*) FROM contacts WHERE "nextFollowup" <= CURRENT_DATE) AS "followupsDue",
        (SELECT COUNT(*) FROM site_visits WHERE status IN ('Scheduled','Confirmed')
           AND "visitDate" >= CURRENT_DATE) AS "upcomingVisits",
        (SELECT COUNT(*) FROM deals WHERE stage NOT IN ('Won','Lost')) AS "activeDeals",
        (SELECT COUNT(*) FROM deals WHERE stage = 'Won') AS "closedDeals",
        (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage = 'Won') AS "totalSales"
    `);

    const recentLeads = await this.q(`
      SELECT c.id, c.name, c.phone, c.city, c."propertyInterest", c."budgetMax",
             c.source, c.stage, c."nextFollowup", c."hasPhoto", u.name AS "agentName"
      FROM contacts c LEFT JOIN users u ON u.id = c."agentId"
      ORDER BY c."createdAt" DESC LIMIT 6
    `);

    // Contacts whose follow-up date is today, plus open tasks due today.
    const followups = await this.q(`
      SELECT 'contact' AS kind, c.id, c.id AS "contactId", c.name AS "contactName", c.phone,
             'Follow-up call' AS title, c.priority, u.name AS "agentName"
      FROM contacts c LEFT JOIN users u ON u.id = c."agentId"
      WHERE c."nextFollowup" = CURRENT_DATE
      UNION ALL
      SELECT 'task' AS kind, t.id, c.id, c.name, c.phone, t.title, t.priority, u.name
      FROM tasks t
      LEFT JOIN contacts c ON c.id = t."contactId"
      LEFT JOIN users u ON u.id = t."assigneeId"
      WHERE t."dueDate" = CURRENT_DATE AND t.status <> 'Completed'
      LIMIT 20
    `);

    const upcomingVisits = await this.q(`
      SELECT v.id, v."visitDate", v."visitTime", v.status,
             c.name AS "contactName", p.title AS "propertyTitle", u.name AS "agentName"
      FROM site_visits v
      JOIN contacts c ON c.id = v."contactId"
      LEFT JOIN properties p ON p.id = v."propertyId"
      LEFT JOIN users u ON u.id = v."agentId"
      WHERE v.status IN ('Scheduled','Confirmed') AND v."visitDate" >= CURRENT_DATE
      ORDER BY v."visitDate", v."visitTime" NULLS LAST LIMIT 5
    `);

    const dealSummary = await this.q(`
      SELECT stage, COUNT(*) AS count, COALESCE(SUM(value), 0) AS value
      FROM deals GROUP BY stage
    `);

    const recentActivity = await this.q(`
      SELECT a.id, a.type, a.outcome, a.notes, a."occurredAt",
             c.id AS "contactId", c.name AS "contactName", u.name AS "agentName"
      FROM activities a
      JOIN contacts c ON c.id = a."contactId"
      LEFT JOIN users u ON u.id = a."agentId"
      ORDER BY a."occurredAt" DESC LIMIT 8
    `);

    const sources = await this.q(`
      SELECT source, COUNT(*) AS count FROM contacts
      GROUP BY source ORDER BY count DESC LIMIT 7
    `);

    return {
      kpis: Object.fromEntries(
        Object.entries(kpi).map(([k, v]) => [k, num(v)]),
      ),
      recentLeads: recentLeads.map((r) => ({
        ...r,
        budgetMax: r.budgetMax == null ? null : num(r.budgetMax),
      })),
      followups,
      upcomingVisits,
      dealSummary: dealSummary.map((r) => ({
        stage: r.stage,
        count: num(r.count),
        value: num(r.value),
      })),
      recentActivity,
      sources: sources.map((r) => ({
        source: r.source,
        count: num(r.count),
      })),
    };
  }

  async leadStatus() {
    const rows: { stage: string; count: string }[] = await this.q(
      `SELECT stage, COUNT(*) AS count FROM contacts GROUP BY stage`,
    );
    const map = new Map(rows.map((r) => [r.stage, num(r.count)]));
    return LEAD_STAGES.map((stage) => ({ stage, count: map.get(stage) ?? 0 }));
  }

  /**
   * Cumulative funnel: a lead at "Negotiation" has also passed through
   * Contacted, Qualified and Site Visit, so it counts toward each of them.
   */
  async funnel() {
    const status = await this.leadStatus();
    const ordered = LEAD_STAGES.filter((s) => s !== 'Lost');
    const total = status.reduce((s, r) => s + r.count, 0);
    return ordered.map((stage, i) => {
      const reached = status
        .filter((r) => ordered.indexOf(r.stage as never) >= i)
        .reduce((s, r) => s + r.count, 0);
      return {
        stage,
        count: reached,
        percent: total ? Math.round((reached / total) * 100) : 0,
      };
    });
  }

  async revenueByMonth(months = 12) {
    const rows: {
      month: string;
      deals: string;
      revenue: string;
      commission: string;
    }[] = await this.q(
      `
      SELECT to_char(date_trunc('month', COALESCE("closedAt", "expectedClosing"::timestamptz)), 'YYYY-MM') AS month,
             COUNT(*) AS deals,
             COALESCE(SUM(value), 0) AS revenue,
             COALESCE(SUM(value * "commissionPct" / 100.0), 0) AS commission
      FROM deals
      WHERE stage = 'Won'
        AND COALESCE("closedAt", "expectedClosing"::timestamptz) >= date_trunc('month', now()) - make_interval(months => $1)
      GROUP BY 1 ORDER BY 1
    `,
      [months - 1],
    );
    return rows.map((r) => ({
      month: r.month,
      deals: num(r.deals),
      revenue: num(r.revenue),
      commission: Math.round(num(r.commission)),
    }));
  }

  async visitOutcomes() {
    const rows: { status: string; count: string }[] = await this.q(
      `SELECT status, COUNT(*) AS count FROM site_visits GROUP BY status ORDER BY count DESC`,
    );
    return rows.map((r) => ({ status: r.status, count: num(r.count) }));
  }

  async propertyInventory() {
    const rows: Record<string, string>[] = await this.q(`
      SELECT status, "listingType", COUNT(*) AS count, COALESCE(SUM(price), 0) AS value
      FROM properties GROUP BY status, "listingType" ORDER BY status, "listingType"
    `);
    return rows.map((r) => ({
      status: r.status,
      listingType: r.listingType,
      count: num(r.count),
      value: num(r.value),
    }));
  }
}
