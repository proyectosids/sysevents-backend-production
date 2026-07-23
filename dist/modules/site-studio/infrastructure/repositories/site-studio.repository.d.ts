export declare class SiteStudioRepository {
    listThemes(): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        previewImageUrl: string | null;
        primaryColor: string;
        globalStyles: unknown;
        template: unknown;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    listAllThemes(): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        previewImageUrl: string | null;
        primaryColor: string;
        globalStyles: unknown;
        template: unknown;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    createTheme(input: {
        key: string;
        name: string;
        description?: string | null;
        previewImageUrl?: string | null;
        primaryColor: string;
        globalStyles: unknown;
        template: unknown;
        isActive?: boolean;
        sortOrder?: number;
    }): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        previewImageUrl: string | null;
        primaryColor: string;
        globalStyles: unknown;
        template: unknown;
        isActive: boolean;
        sortOrder: number;
    }>;
    listPlugins(): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        category: string;
        sectionType: string;
        iconName: string | null;
        defaultTitle: string | null;
        defaultContent: unknown;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    findTheme(id: string): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        previewImageUrl: string | null;
        primaryColor: string;
        globalStyles: unknown;
        template: unknown;
        isActive: boolean;
        sortOrder: number;
    } | null>;
    findPlugin(id: string): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        category: string;
        sectionType: string;
        iconName: string | null;
        defaultTitle: string | null;
        defaultContent: unknown;
        isActive: boolean;
        sortOrder: number;
    } | null>;
    getSettings(eventId: string): Promise<{
        eventId: string;
        themeId: string | null;
        siteTitle: string | null;
        globalStyles: unknown;
        customCss: string | null;
        status: string;
        publishedAt: Date | null;
        theme: {
            id: string;
            key: string | null;
            name: string | null;
            primaryColor: string | null;
        } | null;
    }>;
    updateSettings(eventId: string, input: {
        siteTitle?: string;
        themeId?: string | null;
        globalStyles?: unknown;
        customCss?: string | null;
        status?: string;
    }): Promise<{
        eventId: string;
        themeId: string | null;
        siteTitle: string | null;
        globalStyles: unknown;
        customCss: string | null;
        status: string;
        publishedAt: Date | null;
        theme: {
            id: string;
            key: string | null;
            name: string | null;
            primaryColor: string | null;
        } | null;
    }>;
    listInstalledPlugins(eventId: string): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        category: string;
        sectionType: string;
        iconName: string | null;
        defaultTitle: string | null;
        defaultContent: unknown;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    installPlugin(eventId: string, pluginId: string, userId: string): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        category: string;
        sectionType: string;
        iconName: string | null;
        defaultTitle: string | null;
        defaultContent: unknown;
        isActive: boolean;
        sortOrder: number;
    } | null>;
    listNavigation(eventId: string, onlyVisible?: boolean): Promise<{
        id: string;
        eventId: string;
        label: string;
        url: string;
        target: string;
        sortOrder: number;
        isVisible: boolean;
    }[]>;
    snapshot(eventId: string, revisionType: string, userId?: string): Promise<void>;
}
