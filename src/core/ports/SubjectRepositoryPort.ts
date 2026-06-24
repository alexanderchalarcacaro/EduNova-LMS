import { Subject } from '../../types';

export interface SubjectRepositoryPort {
  getSubjects(): Promise<Subject[]>;
}
