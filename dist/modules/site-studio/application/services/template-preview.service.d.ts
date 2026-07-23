export declare function templateScreenshotRelativePath(sourceFile: string): string;
export declare function ensureTemplateScreenshot(input: {
    rootPath: string;
    sourceFile: string;
    force?: boolean;
}): Promise<string | null>;
