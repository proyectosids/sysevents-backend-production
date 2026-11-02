"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentFinalScore = assessmentFinalScore;
exports.validateAssessmentDefinition = validateAssessmentDefinition;
exports.evaluateAssessment = evaluateAssessment;
function assessmentFinalScore(definition, evaluation) {
    if (!definition.scoreCalculationId)
        return null;
    const value = evaluation.calculated[definition.scoreCalculationId];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
const idPattern = /^[a-z][a-z0-9_]{1,79}$/;
function round(value, decimals = 2) {
    const factor = 10 ** Math.max(0, Math.min(6, decimals));
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
function comparisonMatches(operator, left, right) {
    if (operator === 'eq')
        return left === right;
    if (operator === 'neq')
        return left !== right;
    if (typeof left !== 'number' || typeof right !== 'number')
        return false;
    if (operator === 'gt')
        return left > right;
    if (operator === 'gte')
        return left >= right;
    if (operator === 'lt')
        return left < right;
    return left <= right;
}
function validateAssessmentDefinition(definition) {
    const errors = [];
    if (definition?.schemaVersion !== 1)
        errors.push('La versión de estructura debe ser 1.');
    if (!Array.isArray(definition?.sections) || !definition.sections.length)
        errors.push('Agrega al menos una sección.');
    const fields = new Map();
    const identifiers = new Set();
    for (const contextField of definition?.header?.fields ?? []) {
        if (!idPattern.test(contextField.id) || identifiers.has(contextField.id))
            errors.push(`Identificador de dato de encabezado inválido o repetido: ${contextField.id || '(vacío)'}.`);
        identifiers.add(contextField.id);
        if (!contextField.label?.trim())
            errors.push(`El dato de encabezado ${contextField.id || '(sin id)'} requiere etiqueta.`);
        if (contextField.source === 'registration_field' && !contextField.registrationFieldKey?.trim())
            errors.push(`${contextField.label || contextField.id} requiere la clave del campo de registro.`);
    }
    for (const section of definition?.sections ?? []) {
        if (!idPattern.test(section.id) || identifiers.has(section.id))
            errors.push(`Identificador de sección inválido o repetido: ${section.id || '(vacío)'}.`);
        identifiers.add(section.id);
        if (!section.title?.trim())
            errors.push(`La sección ${section.id || '(sin id)'} requiere título.`);
        for (const field of section.fields ?? []) {
            if (!idPattern.test(field.id) || identifiers.has(field.id))
                errors.push(`Identificador de campo inválido o repetido: ${field.id || '(vacío)'}.`);
            identifiers.add(field.id);
            fields.set(field.id, field);
            if (!field.label?.trim())
                errors.push(`El campo ${field.id || '(sin id)'} requiere etiqueta.`);
            if (['single_choice', 'scale', 'matrix'].includes(field.type)) {
                if (!field.options?.length)
                    errors.push(`El campo ${field.label || field.id} necesita opciones.`);
                const optionIds = new Set();
                for (const option of field.options ?? []) {
                    if (!idPattern.test(option.id) || optionIds.has(option.id))
                        errors.push(`Opción inválida o repetida en ${field.label || field.id}.`);
                    optionIds.add(option.id);
                    if (option.value !== null && !Number.isFinite(option.value))
                        errors.push(`La opción ${option.label} tiene un valor inválido.`);
                }
            }
            if (field.type === 'matrix' && !field.rows?.length)
                errors.push(`La matriz ${field.label || field.id} necesita filas.`);
            if (field.type === 'number' && field.min !== undefined && field.max !== undefined && field.min > field.max)
                errors.push(`El campo ${field.label || field.id} tiene límites inválidos.`);
        }
    }
    const calculations = new Map((definition?.calculations ?? []).map((item) => [item.id, item]));
    for (const calculation of definition?.calculations ?? []) {
        if (!idPattern.test(calculation.id) || identifiers.has(calculation.id))
            errors.push(`Identificador de cálculo inválido o repetido: ${calculation.id || '(vacío)'}.`);
        identifiers.add(calculation.id);
    }
    const dependencies = new Map();
    const inspect = (node, owner) => {
        if (!node || typeof node !== 'object') {
            errors.push(`El cálculo ${owner} contiene una expresión inválida.`);
            return;
        }
        if (node.type === 'field' && !fields.has(node.fieldId))
            errors.push(`El cálculo ${owner} referencia el campo inexistente ${node.fieldId}.`);
        if (node.type === 'calculation') {
            if (!calculations.has(node.calculationId))
                errors.push(`El cálculo ${owner} referencia el cálculo inexistente ${node.calculationId}.`);
            const set = dependencies.get(owner) ?? new Set();
            set.add(node.calculationId);
            dependencies.set(owner, set);
        }
        if (node.type === 'operation') {
            inspect(node.left, owner);
            inspect(node.right, owner);
        }
        if (node.type === 'function') {
            if (!node.args?.length)
                errors.push(`La función de ${owner} necesita argumentos.`);
            node.args?.forEach((argument) => inspect(argument, owner));
        }
        if (node.type === 'condition') {
            inspect(node.left, owner);
            inspect(node.right, owner);
            inspect(node.whenTrue, owner);
            inspect(node.whenFalse, owner);
        }
        if (node.type === 'constant' && !Number.isFinite(node.value))
            errors.push(`El cálculo ${owner} contiene una constante inválida.`);
    };
    for (const calculation of definition?.calculations ?? [])
        inspect(calculation.formula, calculation.id);
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
        if (visiting.has(id)) {
            errors.push(`Dependencia circular detectada en ${id}.`);
            return;
        }
        if (visited.has(id))
            return;
        visiting.add(id);
        for (const dependency of dependencies.get(id) ?? [])
            visit(dependency);
        visiting.delete(id);
        visited.add(id);
    };
    calculations.forEach((_value, id) => visit(id));
    if (definition.scoreCalculationId && !calculations.has(definition.scoreCalculationId)) {
        errors.push(`La calificación final referencia el cálculo inexistente ${definition.scoreCalculationId}.`);
    }
    for (const rule of definition?.outcomeRules ?? []) {
        if (!fields.has(rule.sourceId) && !calculations.has(rule.sourceId))
            errors.push(`La regla ${rule.id} referencia ${rule.sourceId}, que no existe.`);
        if (!rule.recommendation?.trim())
            errors.push(`La regla ${rule.id} necesita una recomendación.`);
    }
    return errors;
}
function evaluateAssessment(definition, answers, comments) {
    const errors = validateAssessmentDefinition(definition);
    if (errors.length)
        return { calculated: {}, recommendation: null, errors };
    const fields = new Map();
    definition.sections.forEach((section) => section.fields.forEach((field) => fields.set(field.id, field)));
    const numericFields = new Map();
    const empty = (value) => value === undefined || value === null || value === '';
    for (const field of fields.values()) {
        const answer = answers[field.id];
        if (field.required && empty(answer))
            errors.push(`${field.label} es obligatorio.`);
        if (field.type === 'number' && !empty(answer)) {
            const numeric = Number(answer);
            if (!Number.isFinite(numeric))
                errors.push(`${field.label} debe ser numérico.`);
            else if ((field.min !== undefined && numeric < field.min) || (field.max !== undefined && numeric > field.max))
                errors.push(`${field.label} está fuera del rango permitido.`);
            else
                numericFields.set(field.id, numeric);
        }
        if (['single_choice', 'scale'].includes(field.type) && !empty(answer)) {
            const option = field.options?.find((item) => item.id === answer);
            if (!option)
                errors.push(`${field.label} contiene una opción inválida.`);
            else if (option.value !== null)
                numericFields.set(field.id, option.value);
            const observation = answers[`${field.id}__observation`];
            if ((field.observation?.required || field.observation?.requiredWhenOptionIds?.includes(String(answer))) && empty(observation))
                errors.push(`Las observaciones de ${field.label} son obligatorias.`);
        }
        if (field.type === 'matrix') {
            const matrix = (answer && typeof answer === 'object' ? answer : {});
            let total = 0;
            let hasNumeric = false;
            for (const row of field.rows ?? []) {
                const selected = matrix[row.id];
                if ((field.required || row.required) && empty(selected))
                    errors.push(`${field.label}: ${row.label} requiere respuesta.`);
                if (!empty(selected)) {
                    const option = field.options?.find((item) => item.id === selected);
                    if (!option)
                        errors.push(`${field.label}: ${row.label} contiene una opción inválida.`);
                    else if (option.value !== null) {
                        total += option.value;
                        hasNumeric = true;
                    }
                }
                if (row.observationRequired && empty(answers[`${field.id}.${row.id}__observation`]))
                    errors.push(`${field.label}: ${row.label} requiere observaciones.`);
            }
            if (hasNumeric)
                numericFields.set(field.id, total);
        }
    }
    if (definition.generalComments?.required && empty(comments))
        errors.push(definition.generalComments.label || 'Las observaciones generales son obligatorias.');
    const calculated = {};
    const calculations = new Map(definition.calculations.map((item) => [item.id, item]));
    const calculating = new Set();
    const evalNode = (node) => {
        if (node.type === 'constant')
            return node.value;
        if (node.type === 'field') {
            const value = numericFields.get(node.fieldId);
            if (value === undefined)
                throw new Error(`El campo ${node.fieldId} no tiene un valor numérico aplicable.`);
            return value;
        }
        if (node.type === 'calculation')
            return calculate(node.calculationId);
        if (node.type === 'operation') {
            const left = evalNode(node.left);
            const right = evalNode(node.right);
            if (node.operator === 'add')
                return left + right;
            if (node.operator === 'subtract')
                return left - right;
            if (node.operator === 'multiply')
                return left * right;
            if (right === 0)
                throw new Error('No es posible dividir entre cero.');
            return left / right;
        }
        if (node.type === 'function') {
            const values = node.args.map(evalNode);
            if (node.function === 'sum')
                return values.reduce((sum, value) => sum + value, 0);
            if (node.function === 'average') {
                if (!values.length)
                    throw new Error('No hay valores para calcular el promedio.');
                return values.reduce((sum, value) => sum + value, 0) / values.length;
            }
            if (values.length !== 2 || values[1] === 0)
                throw new Error('El porcentaje requiere dos valores y un divisor distinto de cero.');
            return (values[0] / values[1]) * 100;
        }
        return comparisonMatches(node.comparison, evalNode(node.left), evalNode(node.right)) ? evalNode(node.whenTrue) : evalNode(node.whenFalse);
    };
    const calculate = (id) => {
        if (calculated[id] !== undefined)
            return calculated[id];
        if (calculating.has(id))
            throw new Error(`Dependencia circular en ${id}.`);
        const calculation = calculations.get(id);
        if (!calculation)
            throw new Error(`Cálculo inexistente: ${id}.`);
        calculating.add(id);
        const value = evalNode(calculation.formula);
        calculating.delete(id);
        if (!Number.isFinite(value))
            throw new Error(`El resultado de ${calculation.label} no es válido.`);
        calculated[id] = round(value, calculation.decimals ?? 2);
        return calculated[id];
    };
    for (const calculation of definition.calculations) {
        try {
            calculate(calculation.id);
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : 'No fue posible calcular el resultado.');
        }
    }
    let recommendation = null;
    for (const rule of [...definition.outcomeRules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))) {
        const source = calculated[rule.sourceId] ?? numericFields.get(rule.sourceId);
        if (source !== undefined && comparisonMatches(rule.operator, source, rule.value)) {
            recommendation = rule.recommendation;
            break;
        }
    }
    return { calculated, recommendation, errors };
}
//# sourceMappingURL=assessment-engine.js.map