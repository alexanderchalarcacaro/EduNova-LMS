import { Plan } from '../../types';

export interface PlanRepositoryPort {
  getActivePlan(): Promise<string | null>;
  saveActivePlan(planId: string): Promise<void>;
}
