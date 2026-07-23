export type UserStatus = 'active' | 'inactive';
export type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
};
export type UserWithPassword = User & {
    passwordHash: string;
};
