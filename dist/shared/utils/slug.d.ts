export declare function slugify(value: string, fallback?: string): string;
export declare function createUniqueSlug(value: string, exists: (slug: string) => Promise<boolean>, options?: {
    fallback?: string;
    maxLength?: number;
}): Promise<string>;
