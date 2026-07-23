export declare function removeTemplatePreloaders(html: string): string;
export declare class TemplateImporterService {
    private readonly rootPath;
    importZip(file: Express.Multer.File, input: {
        name?: string;
        description?: string | null;
    }): Promise<{
        key: string;
        name: string;
        description: string;
        previewImageUrl: string | null;
        primaryColor: string;
        globalStyles: {
            background: string;
            source: string;
            originalFileName: string;
            storagePath: string;
            palette: string[];
            typography: {
                headingFontFamily: string;
                bodyFontFamily: string;
                bodyFontSize: string;
                sectionTitleFontSize: string;
                itemTitleFontSize: string;
            };
            components: {
                borderRadius: number;
                buttonRadius: number;
            };
            tokens: {
                primaryColor: string;
                accentColor: string;
                textColor: string;
                mutedTextColor: string;
                surfaceColor: string;
                buttonColor: string;
                buttonTextColor: string;
            };
            navItems: string[];
        };
        template: {
            source: {
                type: string;
                key: string;
                originalFileName: string;
                filesCount: number;
                indexPath: string;
            };
            pages: {
                title: string;
                slug: string;
                sourceFile: string;
                sortOrder: number;
                sections: {
                    sectionType: string;
                    title: string;
                    content: {
                        preserveTemplateHtml: boolean;
                        sourceFile: string;
                        sourceIndex: number;
                        sourceTag: string;
                        sourceId: string;
                        sourceClasses: string;
                        html: string;
                        cssFiles: string[];
                        jsFiles: string[];
                        elements: never[];
                        objects: never[];
                    };
                }[];
            }[];
            structuralSections: {
                sectionType: string;
                title: string;
                content: {
                    preserveTemplateHtml: boolean;
                    sourceFile: string;
                    sourceIndex: number;
                    sourceTag: string;
                    sourceId: string;
                    sourceClasses: string;
                    html: string;
                    cssFiles: string[];
                    jsFiles: string[];
                    elements: never[];
                    objects: never[];
                };
            }[];
            sections: {
                about: {
                    title: string;
                    content: {
                        body: string;
                        bullets: {
                            text: string;
                        }[];
                    };
                };
                speakers: {
                    title: string;
                    content: {
                        speakers: {
                            name: string;
                            affiliation: string;
                            bio: string;
                        }[];
                    };
                };
                agenda: {
                    title: string;
                    content: {
                        items: {
                            time: string;
                            title: string;
                            description: string;
                        }[];
                    };
                };
                pricing: {
                    title: string;
                    content: {
                        items: {
                            name: string;
                            price: string;
                            description: string;
                        }[];
                    };
                };
                map: {
                    title: string;
                    content: {
                        title: string;
                        address: string;
                        directions: never[];
                    };
                };
                contact: {
                    title: string;
                    content: {
                        email: string;
                        phone: string;
                        address: string;
                    };
                };
            };
        };
    }>;
}
