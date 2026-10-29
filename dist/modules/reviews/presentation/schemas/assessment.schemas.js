"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentResponseSchema = exports.assessmentPreviewSchema = exports.updateAssessmentFormatSchema = exports.createAssessmentFormatSchema = exports.assessmentAssignmentParamsSchema = exports.assessmentVersionParamsSchema = exports.assessmentFormatParamsSchema = exports.assessmentEventParamsSchema = exports.assessmentDefinitionSchema = void 0;
const zod_1 = require("zod");
const id = zod_1.z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const formulaNodeSchema = zod_1.z.lazy(() => zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({ type: zod_1.z.literal('constant'), value: zod_1.z.number().finite() }),
    zod_1.z.object({ type: zod_1.z.literal('field'), fieldId: id }),
    zod_1.z.object({ type: zod_1.z.literal('calculation'), calculationId: id }),
    zod_1.z.object({ type: zod_1.z.literal('operation'), operator: zod_1.z.enum(['add', 'subtract', 'multiply', 'divide']), left: formulaNodeSchema, right: formulaNodeSchema }),
    zod_1.z.object({ type: zod_1.z.literal('function'), function: zod_1.z.enum(['sum', 'average', 'percent']), args: zod_1.z.array(formulaNodeSchema).min(1) }),
    zod_1.z.object({ type: zod_1.z.literal('condition'), comparison: zod_1.z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']), left: formulaNodeSchema, right: formulaNodeSchema, whenTrue: formulaNodeSchema, whenFalse: formulaNodeSchema }),
]));
const optionSchema = zod_1.z.object({ id, label: zod_1.z.string().trim().min(1).max(180), value: zod_1.z.number().finite().nullable(), feedbackLabel: zod_1.z.string().max(180).optional() });
const fieldSchema = zod_1.z.object({
    id,
    label: zod_1.z.string().trim().min(1).max(500),
    description: zod_1.z.string().max(2000).optional(),
    type: zod_1.z.enum(['short_text', 'long_text', 'number', 'single_choice', 'scale', 'matrix']),
    required: zod_1.z.boolean().optional(),
    feedbackVisible: zod_1.z.boolean().optional(),
    min: zod_1.z.number().optional(),
    max: zod_1.z.number().optional(),
    decimals: zod_1.z.number().int().min(0).max(6).optional(),
    options: zod_1.z.array(optionSchema).max(100).optional(),
    rows: zod_1.z.array(zod_1.z.object({ id, label: zod_1.z.string().trim().min(1).max(500), required: zod_1.z.boolean().optional(), observationRequired: zod_1.z.boolean().optional() })).max(300).optional(),
    observation: zod_1.z.object({ enabled: zod_1.z.boolean(), label: zod_1.z.string().max(180).optional(), required: zod_1.z.boolean().optional(), requiredWhenOptionIds: zod_1.z.array(id).optional() }).optional(),
});
exports.assessmentDefinitionSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal(1),
    header: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        title: zod_1.z.string().max(180).optional(),
        showEventIdentity: zod_1.z.boolean().optional(),
        fields: zod_1.z.array(zod_1.z.object({
            id,
            label: zod_1.z.string().trim().min(1).max(180),
            source: zod_1.z.enum(['submission_title', 'submission_type', 'knowledge_area', 'knowledge_line', 'registration_field']),
            registrationFieldKey: zod_1.z.string().trim().max(120).optional(),
        })).max(30).default([]),
    }).optional(),
    sections: zod_1.z.array(zod_1.z.object({ id, title: zod_1.z.string().trim().min(1).max(180), description: zod_1.z.string().max(2000).optional(), feedbackVisible: zod_1.z.boolean().optional(), fields: zod_1.z.array(fieldSchema).max(300) })).min(1).max(50),
    calculations: zod_1.z.array(zod_1.z.object({ id, label: zod_1.z.string().trim().min(1).max(180), formula: formulaNodeSchema, decimals: zod_1.z.number().int().min(0).max(6).optional(), feedbackVisible: zod_1.z.boolean().optional() })).max(100).default([]),
    outcomeRules: zod_1.z.array(zod_1.z.object({ id, sourceId: id, operator: zod_1.z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']), value: zod_1.z.number().finite(), recommendation: zod_1.z.enum(['accept', 'reject', 'changes_requested']), priority: zod_1.z.number().int().optional() })).max(100).default([]),
    generalComments: zod_1.z.object({ enabled: zod_1.z.boolean(), required: zod_1.z.boolean().optional(), feedbackVisible: zod_1.z.boolean().optional(), label: zod_1.z.string().max(180).optional() }).optional(),
    notes: zod_1.z.object({ enabled: zod_1.z.boolean(), title: zod_1.z.string().max(180).optional(), content: zod_1.z.string().max(5000).optional() }).optional(),
});
exports.assessmentEventParamsSchema = zod_1.z.object({ eventId: zod_1.z.string().uuid() });
exports.assessmentFormatParamsSchema = exports.assessmentEventParamsSchema.extend({ formatId: zod_1.z.string().uuid() });
exports.assessmentVersionParamsSchema = exports.assessmentFormatParamsSchema.extend({ versionId: zod_1.z.string().uuid() });
exports.assessmentAssignmentParamsSchema = zod_1.z.object({ kind: zod_1.z.enum(['review', 'evaluation']), assignmentId: zod_1.z.string().uuid() });
const scopeSchema = zod_1.z.object({ programId: zod_1.z.string().uuid().nullable().optional(), submissionTypeId: zod_1.z.string().uuid().nullable().optional() });
exports.createAssessmentFormatSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(180),
    purpose: zod_1.z.enum(['review', 'evaluation']),
    instructions: zod_1.z.string().max(10000).nullable().optional(),
    scopes: zod_1.z.array(scopeSchema).max(100).default([{ programId: null, submissionTypeId: null }]),
    definition: exports.assessmentDefinitionSchema,
    printableTemplateFileId: zod_1.z.string().uuid().nullable().optional(),
});
exports.updateAssessmentFormatSchema = exports.createAssessmentFormatSchema.omit({ purpose: true }).partial().extend({ definition: exports.assessmentDefinitionSchema.optional() });
exports.assessmentPreviewSchema = zod_1.z.object({ definition: exports.assessmentDefinitionSchema, answers: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}), comments: zod_1.z.string().nullable().optional() });
exports.assessmentResponseSchema = zod_1.z.object({ answers: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}), comments: zod_1.z.string().max(10000).nullable().optional(), proposedDecision: zod_1.z.enum(['accept', 'reject', 'changes_requested']).nullable().optional() });
//# sourceMappingURL=assessment.schemas.js.map