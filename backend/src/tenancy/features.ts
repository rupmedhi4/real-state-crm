export const FEATURES = ['dashboard', 'leads', 'properties', 'photos', 'deals', 'visits', 'tasks', 'communications', 'marketing', 'team', 'reports', 'documents', 'brochures'] as const;
export type Feature = typeof FEATURES[number];
export type FeatureFlags = Record<Feature, boolean>;
export const defaultFeatures = (): FeatureFlags => Object.fromEntries(FEATURES.map((key) => [key, true])) as FeatureFlags;
