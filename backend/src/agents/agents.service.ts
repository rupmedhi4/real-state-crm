import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AgentStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  designation: string;
  isActive: boolean;
  assignedLeads: number;
  activeDeals: number;
  wonDeals: number;
  revenue: number;
  siteVisits: number;
  followupsDue: number;
  openTasks: number;
  activitiesLogged: number;
}

/** Team performance, computed live from assigned records. */
@Injectable()
export class AgentsService {
  constructor(private readonly dataSource: DataSource) {}

  async stats(): Promise<AgentStats[]> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.designation, u."isActive",
        (SELECT COUNT(*) FROM contacts c WHERE c."agentId" = u.id) AS "assignedLeads",
        (SELECT COUNT(*) FROM deals d WHERE d."agentId" = u.id
           AND d.stage NOT IN ('Won','Lost')) AS "activeDeals",
        (SELECT COUNT(*) FROM deals d WHERE d."agentId" = u.id AND d.stage = 'Won') AS "wonDeals",
        (SELECT COALESCE(SUM(d.value), 0) FROM deals d
           WHERE d."agentId" = u.id AND d.stage = 'Won') AS revenue,
        (SELECT COUNT(*) FROM site_visits v WHERE v."agentId" = u.id) AS "siteVisits",
        (SELECT COUNT(*) FROM contacts c WHERE c."agentId" = u.id
           AND c."nextFollowup" <= CURRENT_DATE) AS "followupsDue",
        (SELECT COUNT(*) FROM tasks t WHERE t."assigneeId" = u.id
           AND t.status <> 'Completed') AS "openTasks",
        (SELECT COUNT(*) FROM activities a WHERE a."agentId" = u.id) AS "activitiesLogged"
      FROM users u
      ORDER BY u.name
    `);
    const numeric = [
      'assignedLeads',
      'activeDeals',
      'wonDeals',
      'revenue',
      'siteVisits',
      'followupsDue',
      'openTasks',
      'activitiesLogged',
    ];
    return rows.map((r) => {
      const out = { ...r } as Record<string, unknown>;
      for (const k of numeric) out[k] = Number(r[k]);
      return out as unknown as AgentStats;
    });
  }
}
