export type AssessmentPurpose = 'review' | 'evaluation';
export type AssessmentFieldType = 'short_text' | 'long_text' | 'number' | 'single_choice' | 'scale' | 'matrix';
export type AssessmentOption = {
    id: string;
    label: string;
    value: number | null;
    feedbackLabel?: string;
};
export type AssessmentField = {
    id: string;
    label: string;
    description?: string;
    type: AssessmentFieldType;
    required?: boolean;
    feedbackVisible?: boolean;
    min?: number;
    max?: number;
    decimals?: number;
    options?: AssessmentOption[];
    rows?: Array<{
        id: string;
        label: string;
        required?: boolean;
        observationRequired?: boolean;
    }>;
    observation?: {
        enabled: boolean;
        label?: string;
        required?: boolean;
        requiredWhenOptionIds?: string[];
    };
};
export type AssessmentContextSource = 'submission_title' | 'submission_type' | 'knowledge_area' | 'knowledge_line' | 'registration_field';
export type FormulaNode = {
    type: 'constant';
    value: number;
} | {
    type: 'field';
    fieldId: string;
} | {
    type: 'calculation';
    calculationId: string;
} | {
    type: 'operation';
    operator: 'add' | 'subtract' | 'multiply' | 'divide';
    left: FormulaNode;
    right: FormulaNode;
} | {
    type: 'function';
    function: 'sum' | 'average' | 'percent';
    args: FormulaNode[];
} | {
    type: 'condition';
    comparison: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
    left: FormulaNode;
    right: FormulaNode;
    whenTrue: FormulaNode;
    whenFalse: FormulaNode;
};
export type AssessmentDefinition = {
    schemaVersion: 1;
    header?: {
        enabled: boolean;
        title?: string;
        showEventIdentity?: boolean;
        fields: Array<{
            id: string;
            label: string;
            source: AssessmentContextSource;
            registrationFieldKey?: string;
        }>;
    };
    sections: Array<{
        id: string;
        title: string;
        description?: string;
        feedbackVisible?: boolean;
        fields: AssessmentField[];
    }>;
    calculations: Array<{
        id: string;
        label: string;
        formula: FormulaNode;
        decimals?: number;
        feedbackVisible?: boolean;
    }>;
    outcomeRules: Array<{
        id: string;
        sourceId: string;
        operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
        value: number;
        recommendation: string;
        priority?: number;
    }>;
    generalComments?: {
        enabled: boolean;
        required?: boolean;
        feedbackVisible?: boolean;
        label?: string;
    };
    notes?: {
        enabled: boolean;
        title?: string;
        content?: string;
    };
};
export type AssessmentEvaluation = {
    calculated: Record<string, number>;
    recommendation: string | null;
    errors: string[];
};
export declare function validateAssessmentDefinition(definition: AssessmentDefinition): string[];
export declare function evaluateAssessment(definition: AssessmentDefinition, answers: Record<string, unknown>, comments?: string | null): AssessmentEvaluation;
