import { CommunicationsRepository } from '../../infrastructure/repositories/communications.repository';
export declare class EmailService {
    private readonly communicationsRepository;
    constructor(communicationsRepository?: CommunicationsRepository);
    sendTemplate(templateKey: string, recipientEmail: string, variables?: Record<string, string>): Promise<{
        status: "skipped";
        reason: string;
    } | {
        status: "failed";
        reason: string;
    } | {
        status: "sent";
        reason?: undefined;
    }>;
}
