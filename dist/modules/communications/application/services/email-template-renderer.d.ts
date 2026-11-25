export declare function renderTemplateText(template: string, variables: Record<string, string>): string;
export declare function renderBrandedEmail(input: {
    templateKey: string;
    subject: string;
    body: string;
    variables: Record<string, string>;
}): {
    text: string;
    html: string;
};
