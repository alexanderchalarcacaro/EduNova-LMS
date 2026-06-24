export interface Topic {
  id: string;
  name: string;
  description?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Basic';
  videoAsset?: {
    playbackId: string;
    assetId: string;
  };
  videoUrl?: string;
  content?: any;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  tier?: string;
  imageUrl?: string;
  topics: Topic[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  color: string;
}
