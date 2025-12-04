export type SinkType = 'firestore' | 'file';

export interface GenerationConfig {
  jobName: string;
  count: number;
  batchSize: number;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: JSONSchema;
  collection: string;
  sink: SinkType;
  model: string;
}

export interface JSONSchema {
  name: string;
  schema: any;
  strict?: boolean;
}

export interface GenerationJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  completed: number;
  total: number;
  message?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: Partial<GenerationConfig>;
}

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  photoUrl: string;
  country: string;
  bio: string;
  gender: string;
  birthday: string;
  phone: string;
  signedUpAt: string | null;
  lastSeen: string | null;
  isOnline: boolean;
  points: number;
  activityLevel: string;
  bodyWeightKg: number | null;
  age: number | null;
  onboardingData: any;
  healthStats: any[];
}

export interface UsersResponse {
  users: User[];
  total: number;
  hasMore: boolean;
  lastDocId: string | null;
}

