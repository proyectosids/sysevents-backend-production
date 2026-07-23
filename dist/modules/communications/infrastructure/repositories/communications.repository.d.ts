import sql from 'mssql';
export type EmailTemplate = {
    id: string;
    templateKey: string;
    subject: string;
    body: string;
    isActive: boolean;
};
export declare class CommunicationsRepository {
    listTemplates(): Promise<EmailTemplate[]>;
    findTemplateByKey(templateKey: string): Promise<EmailTemplate | null>;
    updateTemplate(id: string, input: {
        subject?: string;
        body?: string;
        isActive?: boolean;
    }): Promise<EmailTemplate | null>;
    createEmailLog(input: {
        templateKey: string;
        recipientEmail: string;
        subject: string;
    }): Promise<string>;
    updateEmailLog(id: string, status: 'sent' | 'failed', errorMessage?: string): Promise<void>;
    listEmailLogs(): Promise<sql.IRecordSet<any>>;
    createNotification(input: {
        userId?: string | null;
        recipientEmail?: string | null;
        type: string;
        title: string;
        message: string;
    }): Promise<void>;
}
