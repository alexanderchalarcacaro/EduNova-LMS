import { ChatRepositoryPort } from '../ports/ChatRepositoryPort';
import { ChatMessage } from '../../types';

export class ManageChatUseCase {
  constructor(private chatRepo: ChatRepositoryPort) {}

  async fetchHistory(userId: string, subjectId: string, topicId: string): Promise<ChatMessage[]> {
    return this.chatRepo.getChatHistory(userId, subjectId, topicId);
  }

  async persistMessage(
    userId: string,
    subjectId: string,
    topicId: string,
    topicName: string,
    messages: ChatMessage[]
  ): Promise<void> {
    return this.chatRepo.saveChatMessage(userId, subjectId, topicId, topicName, messages);
  }

  async fetchAllUserChats(userId: string): Promise<any[]> {
    return this.chatRepo.getUserAllChats(userId);
  }

  async deleteChat(userId: string, subjectId: string, topicId: string): Promise<void> {
    return this.chatRepo.deleteChatMessage(userId, subjectId, topicId);
  }
}
