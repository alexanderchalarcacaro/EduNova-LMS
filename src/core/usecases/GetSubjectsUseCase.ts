import { SubjectRepositoryPort } from '../ports/SubjectRepositoryPort';
import { Subject } from '../../types';

export class GetSubjectsUseCase {
  constructor(private subjectRepo: SubjectRepositoryPort) {}

  async execute(): Promise<Subject[]> {
    return this.subjectRepo.getSubjects();
  }
}
