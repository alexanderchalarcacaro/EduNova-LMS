export type PlanType = 'free_user' | 'pro' | 'ultra';

export interface Plan {
  id: PlanType;
  name: string;
  price: string;
  features: string[];
  color: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: Topic[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  cached?: boolean;
  classification?: 'Factual' | 'Procedimental';
}

export interface LearningSession {
  subject: Subject;
  selectedTopics: Topic[];
  currentTopicIndex: number;
  history: Message[];
}
