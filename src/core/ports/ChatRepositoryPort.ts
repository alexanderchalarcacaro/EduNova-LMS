import { ChatMessage } from '../../types';

export interface ChatRepositoryPort {
  getChatHistory(userId: string, subjectId: string, topicId: string): Promise<ChatMessage[]>;
  saveChatMessage(
    userId: string,
    subjectId: string,
    topicId: string,
    topicName: string,
    messages: ChatMessage[]
  ): Promise<void>;
  getUserAllChats(userId: string): Promise<any[]>;
  deleteChatMessage(userId: string, subjectId: string, topicId: string): Promise<void>;
}
