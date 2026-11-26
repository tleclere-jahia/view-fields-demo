import {RULES} from './rules.js';

const VIEW = 'j:view';
const DEFAULT_VIEW = 'default';

const normalizeView = value => (value === undefined || value === null || value === '' ? DEFAULT_VIEW : value);

/**
 * The managed properties that the given view hides, for the given node type.
 */
export const hiddenProperties = (nodeType, view, rules = RULES) => {
    const rule = rules[nodeType];
    if (!rule) {
        return [];
    }

    const shown = rule.views[normalizeView(view)] || [];
    return rule.managed.filter(name => !shown.includes(name));
};

const formNodeType = ctx => (ctx.mode === 'create' ? ctx.nodeTypeName : ctx.nodeData?.primaryNodeType?.name);

const ownsField = (field, nodeType) => (field.declaringNodeType || field.nodeType) === nodeType;

/**
 * selectorType.onChange: shows or hides the managed fields when j:view changes or the form loads.
 * The values stay in the form, so a contributor who switches back finds them again.
 */
export const onViewChange = (previousValue, currentValue, field, ctx, rules = RULES) => {
    if (field.propertyName !== VIEW || !ctx?.sections || currentValue === undefined) {
        return false;
    }

    const nodeType = formNodeType(ctx);
    const rule = rules[nodeType];
    if (!rule) {
        return false;
    }

    const hidden = hiddenProperties(nodeType, currentValue, rules);
    let changed = false;
    ctx.sections.forEach(section => section.fieldSets.forEach(fieldSet => fieldSet.fields.forEach(f => {
        if (ownsField(f, nodeType) && rule.managed.includes(f.propertyName)) {
            const visible = !hidden.includes(f.propertyName);
            if (f.visible !== visible) {
                f.visible = visible;
                changed = true;
            }
        }
    })));

    if (changed) {
        // New objects, so that the memoized fieldsets render again
        ctx.sections.forEach(section => {
            section.fieldSets = section.fieldSets.map(fieldSet => ({...fieldSet, fields: fieldSet.fields.map(f => ({...f}))}));
        });
        ctx.onSectionsUpdate?.();
    }

    return changed;
};

const valueOf = property => (property ? (property.value ?? property.values) : undefined);

/**
 * contentEditor.onEdit: drops the hidden properties from the save, and deletes the ones the node stores.
 */
export const onEdit = (variables, nodeData, rules = RULES) => {
    const nodeType = nodeData?.primaryNodeType?.name;
    if (!rules[nodeType]) {
        return variables;
    }

    const toSave = variables.propertiesToSave || [];
    const toDelete = variables.propertiesToDelete || [];
    const saved = toSave.find(p => p.name === VIEW);
    const deleted = toDelete.some(p => p.name === VIEW);
    const stored = nodeData.properties?.find(p => p.name === VIEW);
    const view = saved ? valueOf(saved) : (deleted ? undefined : valueOf(stored));

    const hidden = hiddenProperties(nodeType, view, rules);
    const storedNames = new Set((nodeData.properties || []).map(p => p.name));
    const deleteNames = new Set(toDelete.map(p => p.name));

    return {
        ...variables,
        propertiesToSave: toSave.filter(p => !hidden.includes(p.name)),
        propertiesToDelete: [
            ...toDelete,
            ...hidden
                .filter(name => storedNames.has(name) && !deleteNames.has(name))
                .map(name => ({name, language: variables.language}))
        ]
    };
};

/**
 * contentEditor.onCreate: drops the hidden properties from the new node.
 */
export const onCreate = (variables, nodeData, rules = RULES) => {
    const nodeType = variables.primaryNodeType;
    if (!rules[nodeType]) {
        return variables;
    }

    const properties = variables.properties || [];
    const view = valueOf(properties.find(p => p.name === VIEW));
    const hidden = hiddenProperties(nodeType, view, rules);
    return {...variables, properties: properties.filter(p => !hidden.includes(p.name))};
};

export const registerViewFields = registry => {
    registry.add('selectorType.onChange', 'viewFieldsDemoVisibility', {
        targets: ['*'],
        onChange: (previousValue, currentValue, field, ctx) => {
            onViewChange(previousValue, currentValue, field, ctx);
        }
    });
    registry.add('contentEditor.onEdit', 'viewFieldsDemoCleanup', {onEdit: (variables, nodeData) => onEdit(variables, nodeData)});
    registry.add('contentEditor.onCreate', 'viewFieldsDemoCleanup', {onCreate: (variables, nodeData) => onCreate(variables, nodeData)});
};
