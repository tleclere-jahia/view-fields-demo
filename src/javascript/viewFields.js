// Shows each field of a form only in the views of j:view that its selector option `views` lists,
// for a node type or a node that holds the marker mixin, and clears the hidden values on save.
// The CND states everything: no configuration lives here.

export const MIXIN = 'vfdmix:viewDependentFields';
const OPTION = 'views';
const VIEW = 'j:view';
const DEFAULT_VIEW = 'default';

const normalizeView = value => (value === undefined || value === null || value === '' ? DEFAULT_VIEW : value);

/**
 * The views a field shows in, from its selector option `views`, or null when it shows in every view.
 */
export const fieldViews = field => {
    const option = (field.selectorOptions || []).find(o => o.name === OPTION);
    if (!option || option.value === undefined || option.value === null) {
        return null;
    }

    const views = String(option.value).split(',').map(v => v.trim()).filter(Boolean);
    return views.length > 0 ? views : null;
};

const isShown = (views, view) => !views || views.includes(normalizeView(view));

// What the forms taught about each node type: whether it holds the mixin, and the views of its
// properties. The save hooks have no form, so they read it here; a save always follows its form.
const typeState = new Map();

const stateOf = nodeType => {
    if (!typeState.has(nodeType)) {
        typeState.set(nodeType, {hasMixin: undefined, views: {}});
    }

    return typeState.get(nodeType);
};

export const resetState = () => typeState.clear();

const typesOfNode = nodeData => new Set([
    nodeData?.primaryNodeType?.name,
    ...(nodeData?.primaryNodeType?.supertypes || []).map(t => t.name),
    ...(nodeData?.mixinTypes || []).map(t => t.name)
]);

const nodeHasMixin = nodeData => typesOfNode(nodeData).has(MIXIN);

const contextPath = () => (typeof window === 'undefined' ? '' : (window.contextJsParameters?.contextPath || ''));

// The create form loads no supertype of the new type, so ask the server once per type
export const fetchTypeHasMixin = async nodeType => {
    const query = 'query($t: String!, $m: [String]!) { jcr { nodeTypeByName(name: $t) { isNodeType(type: {types: $m}) } } }';
    const response = await fetch(`${contextPath()}/modules/graphql`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({query, variables: {t: nodeType, m: [MIXIN]}})
    });
    const body = await response.json();
    return Boolean(body?.data?.jcr?.nodeTypeByName?.isNodeType);
};

const formNodeType = ctx => (ctx.mode === 'create' ? ctx.nodeTypeName : ctx.nodeData?.primaryNodeType?.name);

const allFields = sections => sections.flatMap(section => section.fieldSets.flatMap(fieldSet => fieldSet.fields));

const currentView = (currentValue, field, fields, ctx) => {
    if (field.propertyName === VIEW) {
        return currentValue;
    }

    const viewField = fields.find(f => f.propertyName === VIEW);
    return viewField ? ctx.formik?.values?.[viewField.name] : undefined;
};

const applyVisibility = (ctx, view) => {
    let changed = false;
    allFields(ctx.sections).forEach(f => {
        const views = fieldViews(f);
        if (views) {
            const visible = isShown(views, view);
            if (f.visible !== visible) {
                f.visible = visible;
                changed = true;
            }
        }
    });

    if (changed) {
        // New objects, so that the memoized fieldsets render again
        ctx.sections.forEach(section => {
            section.fieldSets = section.fieldSets.map(fieldSet => ({...fieldSet, fields: fieldSet.fields.map(f => ({...f}))}));
        });
        ctx.onSectionsUpdate?.();
    }

    return changed;
};

/**
 * Whether the type of the form holds the mixin: true, false, or a promise while the server answers.
 */
const formHasMixin = (ctx, nodeType, fetchHasMixin) => {
    const state = stateOf(nodeType);
    if (ctx.mode !== 'create') {
        state.hasMixin = nodeHasMixin(ctx.nodeData);
        return state.hasMixin;
    }

    if (state.hasMixin === undefined) {
        state.hasMixin = fetchHasMixin(nodeType)
            .then(has => {
                state.hasMixin = has;
                return has;
            })
            .catch(() => {
                state.hasMixin = undefined;
                return false;
            });
    }

    return state.hasMixin;
};

/**
 * selectorType.onChange on every field: shows or hides the fields that carry the option `views`.
 * The server drops a field hidden by a form override, so the fields arrive visible and the client hides them.
 * j:view may hold no value and then never fires, so any field that mounts with a value, such as ce:systemName,
 * applies the view too. The values stay in the form, so a contributor who switches back finds them again.
 * Returns true when it changed the form, or a promise of that while the create form waits for the server.
 */
export const onViewChange = (previousValue, currentValue, field, ctx, fetchHasMixin = fetchTypeHasMixin) => {
    if (!ctx?.sections) {
        return false;
    }

    if (field.propertyName === VIEW && currentValue === undefined) {
        // undefined on j:view is the unmount of the field, not a choice
        keepLayoutOpen(ctx, field, currentValue, false);
        return false;
    }

    const nodeType = formNodeType(ctx);
    const fields = allFields(ctx.sections);
    const viewDependent = fields.filter(f => fieldViews(f));
    if (!nodeType || viewDependent.length === 0) {
        return false;
    }

    const state = stateOf(nodeType);
    viewDependent.forEach(f => {
        state.views[f.propertyName] = fieldViews(f);
    });

    const view = currentView(currentValue, field, fields, ctx);
    const has = formHasMixin(ctx, nodeType, fetchHasMixin);
    const apply = ok => {
        keepLayoutOpen(ctx, field, currentValue, ok);
        return ok ? applyVisibility(ctx, view) : false;
    };

    return has && typeof has.then === 'function' ? has.then(apply) : apply(Boolean(has));
};

const valueOf = property => (property ? (property.value ?? property.values) : undefined);

const hiddenNames = (views, view) => Object.keys(views).filter(name => !isShown(views[name], view));

/**
 * contentEditor.onEdit: drops the hidden properties from the save, and deletes the ones the node stores.
 */
export const onEditWith = (variables, nodeData) => {
    if (!nodeHasMixin(nodeData)) {
        return variables;
    }

    const views = typeState.get(nodeData.primaryNodeType.name)?.views || {};
    const toSave = variables.propertiesToSave || [];
    const toDelete = variables.propertiesToDelete || [];
    const saved = toSave.find(p => p.name === VIEW);
    const deleted = toDelete.some(p => p.name === VIEW);
    const stored = nodeData.properties?.find(p => p.name === VIEW);
    const view = saved ? valueOf(saved) : (deleted ? undefined : valueOf(stored));

    const hidden = hiddenNames(views, view);
    const deleteNames = new Set(toDelete.map(p => p.name));
    const storedHidden = [...new Set((nodeData.properties || []).map(p => p.name).filter(name => hidden.includes(name)))];

    return {
        ...variables,
        propertiesToSave: toSave.filter(p => !hidden.includes(p.name)),
        propertiesToDelete: [
            ...toDelete,
            ...storedHidden.filter(name => !deleteNames.has(name)).map(name => ({name, language: variables.language}))
        ]
    };
};

/**
 * contentEditor.onCreate: drops the hidden properties from the new node.
 */
export const onCreate = variables => {
    const state = typeState.get(variables.primaryNodeType);
    const hasMixin = state?.hasMixin === true || (variables.mixins || []).includes(MIXIN);
    if (!hasMixin) {
        return variables;
    }

    const properties = variables.properties || [];
    const view = valueOf(properties.find(p => p.name === VIEW));
    const hidden = hiddenNames(state?.views || {}, view);
    return {...variables, properties: properties.filter(p => !hidden.includes(p.name))};
};

// The layout section, which holds j:view, stays open in a form of the mixin. The form override
// vfdmix_viewDependentFields.json puts it first and opens it; a click would still fold it, so the
// module opens it again. Content Editor keeps the open sections of each form in Redux under its
// formKey, which only the URL hash ties to the node of the form.
const LAYOUT = 'layout';
const TOGGLE_ACTION = 'CE_TOGGLE_SECTIONS';
const alwaysOpenForms = new Set();

/**
 * The editors that the URL hash lists, such as (contentEditor:!((formKey:modal_0,mode:edit,uuid:'…'))).
 */
export const editorsInHash = hash => {
    const decoded = decodeURIComponent(hash || '');
    const editors = [];
    for (const match of decoded.matchAll(/\(([^()]*formKey:[^()]*)\)/g)) {
        const entry = {};
        for (const pair of match[1].match(/[A-Za-z]+:('[^']*'|[^,]*)/g) || []) {
            const index = pair.indexOf(':');
            entry[pair.slice(0, index)] = pair.slice(index + 1).replace(/^'|'$/g, '');
        }

        editors.push(entry);
    }

    return editors;
};

export const formKeyOf = (ctx, hash) => {
    const editors = editorsInHash(hash);
    const editor = ctx.mode === 'create' ?
        editors.find(e => e.mode === 'create' && e.contentType === ctx.nodeTypeName) :
        editors.find(e => e.mode !== 'create' && e.uuid === ctx.nodeData?.uuid);
    return editor?.formKey;
};

/**
 * The toggle action that opens the layout section again, or null when every form of the mixin keeps it open.
 */
export const reopenLayout = (toggleStates, formKeys) => {
    for (const key of formKeys) {
        const sections = toggleStates?.[key];
        if (sections && sections[LAYOUT] === false) {
            return {type: TOGGLE_ACTION, payload: {key, sections: {...sections, [LAYOUT]: true}}};
        }
    }

    return null;
};

let unsubscribe = null;
const watchLayout = () => {
    const store = typeof window === 'undefined' ? null : window.jahia?.reduxStore;
    if (unsubscribe || !store) {
        return;
    }

    unsubscribe = store.subscribe(() => {
        const action = reopenLayout(store.getState().contenteditor?.ceToggleSections, alwaysOpenForms);
        if (action) {
            store.dispatch(action);
        }
    });
};

const keepLayoutOpen = (ctx, field, currentValue, hasMixin) => {
    if (typeof window === 'undefined') {
        return;
    }

    const formKey = formKeyOf(ctx, window.location.hash);
    if (!formKey) {
        return;
    }

    if (field.propertyName === VIEW && currentValue === undefined) {
        // The form closes, and its key will name another form
        alwaysOpenForms.delete(formKey);
    } else if (hasMixin) {
        alwaysOpenForms.add(formKey);
        watchLayout();
    }
};

export const registerViewFields = registry => {
    registry.add('selectorType.onChange', 'viewFieldsDemoVisibility', {
        targets: ['*'],
        onChange: (previousValue, currentValue, field, ctx) => {
            onViewChange(previousValue, currentValue, field, ctx);
        }
    });
    registry.add('contentEditor.onEdit', 'viewFieldsDemoCleanup', {onEdit: (variables, nodeData) => onEditWith(variables, nodeData)});
    registry.add('contentEditor.onCreate', 'viewFieldsDemoCleanup', {onCreate: variables => onCreate(variables)});
};
