import { IamRepository } from '../../iam/infrastructure/repositories/iam.repository';
import { TenantsRepository } from '../infrastructure/repositories/tenants.repository';
export declare function syncTenantRoles(userId: string, iamRepository?: IamRepository, tenantsRepository?: TenantsRepository): Promise<void>;
