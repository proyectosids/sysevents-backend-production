import { IamRepository } from '../../infrastructure/repositories/iam.repository';
type JwtPayload = {
    sub: string;
    email: string;
};
export declare class AuthService {
    private readonly iamRepository;
    constructor(iamRepository?: IamRepository);
    register(input: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }, options?: {
        assignPlatformAdminIfFirstUser?: boolean;
    }): Promise<import("../../domain/entities/user").User>;
    registerOrAuthenticateExisting(input: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<import("../../domain/entities/user").User>;
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: string;
        refreshExpiresAt: Date;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: string;
        refreshExpiresAt: Date;
    }>;
    logout(refreshToken: string): Promise<void>;
    issueSessionForUser(userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: string;
        refreshExpiresAt: Date;
    }>;
    verifyAccessToken(token: string): JwtPayload;
    private createSession;
}
export {};
