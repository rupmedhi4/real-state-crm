export type Role = 'ADMIN' | 'MANAGER' | 'AGENT';

export interface Ref {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  designation: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserOption {
  id: string;
  name: string;
  role: Role;
  designation: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  occupation: string | null;
  source: string;
  campaignId: string | null;
  campaign: { id: string; name: string } | null;
  propertyInterest: string | null;
  propertyCategory: string;
  intent: string;
  configuration: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferences: string | null;
  stage: string;
  priority: string;
  score: number;
  agentId: string | null;
  agent: Ref | null;
  nextFollowup: string | null;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyImage {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  url: string;
}

export interface Property {
  id: string;
  title: string;
  listingType: string;
  category: string;
  propertyType: string;
  price: number | null;
  bedrooms: number | null;
  areaSqft: number | null;
  city: string | null;
  locality: string | null;
  address: string | null;
  status: string;
  description: string | null;
  agentId: string | null;
  agent: Ref | null;
  images: PropertyImage[];
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string | null;
  contactId: string;
  contact: { id: string; name: string; phone: string | null } | null;
  propertyId: string | null;
  property: { id: string; title: string; locality: string | null } | null;
  value: number | null;
  expectedClosing: string | null;
  stage: string;
  probability: number;
  commissionPct: number;
  commissionAmount: number | null;
  transactionStatus: string;
  agentId: string | null;
  agent: Ref | null;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DealSummary {
  pipelineValue: number;
  weightedValue: number;
  open: number;
  won: number;
  lost: number;
  total: number;
  winRate: number;
  revenue: number;
  commissionEarned: number;
}

export interface Visit {
  id: string;
  contactId: string;
  contact: { id: string; name: string; phone: string | null } | null;
  propertyId: string | null;
  property: { id: string; title: string; locality: string | null } | null;
  visitDate: string;
  visitTime: string | null;
  agentId: string | null;
  agent: Ref | null;
  status: string;
  notes: string | null;
  feedback: string | null;
}

export interface Task {
  id: string;
  title: string;
  contactId: string | null;
  contact: { id: string; name: string; phone: string | null } | null;
  type: string;
  priority: string;
  dueDate: string | null;
  dueTime: string | null;
  assigneeId: string | null;
  assignee: Ref | null;
  status: string;
  completedAt: string | null;
  notes: string | null;
}

export interface Activity {
  id: string;
  contactId: string;
  contact: { id: string; name: string; phone: string | null } | null;
  type: string;
  outcome: string | null;
  agentId: string | null;
  agent: Ref | null;
  notes: string | null;
  occurredAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  source: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string;
  notes: string | null;
  leads?: number;
  qualified?: number;
  won?: number;
  revenue?: number;
  conversion?: number;
  costPerLead?: number | null;
}

export interface SourcePerf {
  source: string;
  leads: number;
  qualified: number;
  won: number;
  revenue: number;
  conversion: number;
}

export interface CrmDocument {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  contactId: string | null;
  contact: Ref | null;
  propertyId: string | null;
  property: { id: string; title: string } | null;
  dealId: string | null;
  deal: { id: string; title: string | null } | null;
  uploadedBy: Ref | null;
  createdAt: string;
}

export interface AgentStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
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

export interface Settings {
  companyName: string;
  tagline: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  currency: string;
  dateFormat: string;
}

export interface Meta {
  roles: Role[];
  designations: string[];
  leadStages: string[];
  clientStages: string[];
  leadSources: string[];
  priorities: string[];
  propertyCategories: string[];
  intents: string[];
  listingTypes: string[];
  propertyTypes: string[];
  propertyStatuses: string[];
  dealStages: string[];
  transactionStatuses: string[];
  visitStatuses: string[];
  taskTypes: string[];
  taskStatuses: string[];
  activityTypes: string[];
  activityOutcomes: string[];
  campaignStatuses: string[];
  documentCategories: string[];
}

export interface Dashboard {
  kpis: Record<string, number>;
  recentLeads: {
    id: string;
    name: string;
    phone: string | null;
    city: string | null;
    propertyInterest: string | null;
    budgetMax: number | null;
    source: string;
    stage: string;
    nextFollowup: string | null;
    hasPhoto: boolean;
    agentName: string | null;
  }[];
  followups: {
    kind: 'contact' | 'task';
    id: string;
    contactId: string | null;
    contactName: string | null;
    phone: string | null;
    title: string;
    priority: string;
    agentName: string | null;
  }[];
  upcomingVisits: {
    id: string;
    visitDate: string;
    visitTime: string | null;
    status: string;
    contactName: string;
    propertyTitle: string | null;
    agentName: string | null;
  }[];
  dealSummary: { stage: string; count: number; value: number }[];
  recentActivity: {
    id: string;
    type: string;
    outcome: string | null;
    notes: string | null;
    occurredAt: string;
    contactId: string;
    contactName: string;
    agentName: string | null;
  }[];
  sources: { source: string; count: number }[];
}
