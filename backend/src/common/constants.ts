// Shared business vocabularies. Values match the legacy Estateflow HTML app so
// existing data and UI labels carry over unchanged.

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
}

export const LEAD_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Site Visit',
  'Negotiation',
  'Won',
  'Lost',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

// A contact counts as a client once it has been qualified.
export const CLIENT_STAGES: LeadStage[] = [
  'Qualified',
  'Site Visit',
  'Negotiation',
  'Won',
];

export const LEAD_SOURCES = [
  'Website',
  'Landing Page',
  'Facebook/Instagram Ads',
  'Google Ads',
  'WhatsApp Enquiry',
  'Phone Call',
  'Walk-in',
  'Referral',
  '99acres',
  'MagicBricks',
  'Housing.com',
  'Other',
] as const;

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const PROPERTY_CATEGORIES = [
  'Residential',
  'Commercial',
  'Plot/Land',
] as const;
export const INTENTS = ['Buy', 'Rent', 'Invest'] as const;

export const LISTING_TYPES = ['Sale', 'Rent', 'Lease'] as const;
export const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Independent House',
  'Office',
  'Shop',
  'Warehouse',
  'Land',
  'Other',
] as const;
export const PROPERTY_STATUSES = [
  'Available',
  'Under Offer',
  'Sold',
  'Rented',
] as const;

export const DEAL_STAGES = [
  'New Opportunity',
  'Qualified',
  'Site Visit',
  'Offer',
  'Negotiation',
  'Won',
  'Lost',
] as const;
export const TRANSACTION_STATUSES = [
  'Not Started',
  'Token Paid',
  'Agreement Signed',
  'Payment In Progress',
  'Registered',
  'Cancelled',
] as const;

export const VISIT_STATUSES = [
  'Scheduled',
  'Confirmed',
  'Completed',
  'Rescheduled',
  'Cancelled',
  'No-show',
] as const;

export const TASK_TYPES = [
  'Call',
  'Meeting',
  'Follow-up',
  'Site Visit Prep',
  'Document',
  'Other',
] as const;
export const TASK_STATUSES = ['Pending', 'Completed'] as const;

export const ACTIVITY_TYPES = [
  'Call',
  'Email',
  'WhatsApp',
  'Meeting',
  'Note',
  'Status Change',
] as const;
export const ACTIVITY_OUTCOMES = [
  'Connected',
  'No Answer',
  'Follow-up Scheduled',
  'Interested',
  'Not Interested',
  'Other',
] as const;

export const CAMPAIGN_STATUSES = ['Active', 'Paused', 'Completed'] as const;

export const DOCUMENT_CATEGORIES = [
  'Property Brochure',
  'Property Photographs',
  'Floor Plan',
  'Ownership Document',
  'Agreement',
  'ID Verification',
  'Payment Document',
  'Other',
] as const;

export const DESIGNATIONS = [
  'Agent',
  'Senior Agent',
  'Manager',
  'Admin',
] as const;
