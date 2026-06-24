import { SanitySubjectRepository } from '../adapters/repositories/SanitySubjectRepository';
import { SupabaseChatRepository } from '../adapters/repositories/SupabaseChatRepository';
import { LocalStoragePlanRepository } from '../adapters/repositories/LocalStoragePlanRepository';

import { GetSubjectsUseCase } from './usecases/GetSubjectsUseCase';
import { ManageChatUseCase } from './usecases/ManageChatUseCase';
import { ManagePlanUseCase } from './usecases/ManagePlanUseCase';

// Instantiate Repository Adapters
const subjectRepository = new SanitySubjectRepository();
const chatRepository = new SupabaseChatRepository();
const planRepository = new LocalStoragePlanRepository();

// Expose instantiated Use Cases (Driving ports) for downstream UI consuming
export const getSubjectsUseCase = new GetSubjectsUseCase(subjectRepository);
export const manageChatUseCase = new ManageChatUseCase(chatRepository);
export const managePlanUseCase = new ManagePlanUseCase(planRepository);
