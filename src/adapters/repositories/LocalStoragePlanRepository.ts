import { PlanRepositoryPort } from '../../core/ports/PlanRepositoryPort';

export class LocalStoragePlanRepository implements PlanRepositoryPort {
  async getActivePlan(): Promise<string | null> {
    return localStorage.getItem('edunova_active_plan');
  }

  async saveActivePlan(planId: string): Promise<void> {
    localStorage.setItem('edunova_active_plan', planId);
  }
}
