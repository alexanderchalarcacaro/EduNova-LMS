import { ChatRepositoryPort } from '../../core/ports/ChatRepositoryPort';
import { ChatMessage } from '../../types';
import { getUserAllChats, getChatHistory, saveChatMessage, deleteChatMessage } from '../../services/supabase';

export class SupabaseChatRepository implements ChatRepositoryPort {
  async getChatHistory(userId: string, subjectId: string, topicId: string): Promise<ChatMessage[]> {
    return getChatHistory(userId || 'anonymous_user', subjectId, topicId);
  }

  async saveChatMessage(
    userId: string,
    subjectId: string,
    topicId: string,
    topicName: string,
    messages: ChatMessage[]
  ): Promise<void> {
    return saveChatMessage(userId || 'anonymous_user', subjectId, topicId, topicName, messages);
  }

  async getUserAllChats(userId: string): Promise<any[]> {
    return getUserAllChats(userId || 'anonymous_user');
  }

  async deleteChatMessage(userId: string, subjectId: string, topicId: string): Promise<void> {
    return deleteChatMessage(userId || 'anonymous_user', subjectId, topicId);
  }
}
