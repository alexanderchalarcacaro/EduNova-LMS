import { PlanRepositoryPort } from '../ports/PlanRepositoryPort';

export class ManagePlanUseCase {
  constructor(private planRepo: PlanRepositoryPort) {}

  async getActivePlanId(): Promise<string | null> {
    return this.planRepo.getActivePlan();
  }

  async changeActivePlan(planId: string): Promise<void> {
    return this.planRepo.saveActivePlan(planId);
  }
}
