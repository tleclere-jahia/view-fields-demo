import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {MIXIN, fieldViews, onCreate, onEditWith, onViewChange, resetState} from './viewFields.js';

const DEMO = 'vfdnt:viewFieldsDemo';
const TEASER = 'vfdnt:teaser';
const CONTROL = 'vfdnt:control';

// The properties of each type, as the CND declares them: name -> views option, or null
const TYPES = {
    [DEMO]: {intro: null, cardSubtitle: 'card', cardImage: 'card', maxItems: 'list', listStyle: 'list'},
    [TEASER]: {teaserText: null, badge: 'card,list', cardSubtitle: 'card', maxItems: 'list'},
    [CONTROL]: {maxItems: 'list'}
};

const field = (type, propertyName, views) => ({
    name: `${type}_${propertyName}`, propertyName, nodeType: type, declaringNodeType: type, visible: true,
    selectorOptions: views ? [{name: 'views', value: views}] : []
});
const formOf = type => [
    {name: 'content', fieldSets: [{name: type, fields: Object.entries(TYPES[type]).map(([p, v]) => field(type, p, v))}]},
    {name: 'layout', fieldSets: [{name: 'jmix:renderable', fields: [field('jmix:renderable', 'j:view', null)]}]}
];
const visibility = sections => Object.fromEntries(sections[0].fieldSets[0].fields.map(f => [f.propertyName, f.visible]));
const nodeData = (type, properties, {mixin = type !== CONTROL, instanceMixin = false} = {}) => ({
    primaryNodeType: {name: type, supertypes: [{name: 'jnt:content'}, ...(mixin ? [{name: MIXIN}] : [])]},
    mixinTypes: instanceMixin ? [{name: MIXIN}] : [],
    properties: properties.map(([name, value]) => ({name, value}))
});
const editCtx = (type, opts) => ({mode: 'edit', nodeData: nodeData(type, [], opts), sections: formOf(type), formik: {values: {}}, onSectionsUpdate: () => {}});

beforeEach(() => resetState());

test('the views option reads as a list', () => {
    assert.deepEqual(fieldViews(field(TEASER, 'badge', 'card, list')), ['card', 'list']);
    assert.equal(fieldViews(field(TEASER, 'teaserText', null)), null);
});

for (const type of [DEMO, TEASER]) {
    test(`the form of ${type} follows j:view from the CND options`, () => {
        const ctx = editCtx(type);
        onViewChange(undefined, 'x', {propertyName: 'ce:systemName'}, ctx);
        const expected = Object.fromEntries(Object.entries(TYPES[type]).map(([p, v]) => [p, v === null]));
        assert.deepEqual(visibility(ctx.sections), expected);

        assert.equal(onViewChange(undefined, 'card', {propertyName: 'j:view'}, ctx), true);
        const card = Object.fromEntries(Object.entries(TYPES[type]).map(([p, v]) => [p, v === null || v.split(',').includes('card')]));
        assert.deepEqual(visibility(ctx.sections), card);
    });
}

test('on edit of the teaser, a switch from list to card deletes maxItems and keeps the badge', () => {
    const ctx = editCtx(TEASER);
    onViewChange(undefined, 'list', {propertyName: 'j:view'}, ctx);
    const data = nodeData(TEASER, [['j:view', 'list'], ['badge', 'b'], ['maxItems', '6'], ['teaserText', 't']]);
    const variables = {language: 'en', propertiesToSave: [{name: 'j:view', value: 'card'}, {name: 'cardSubtitle', value: 's'}], propertiesToDelete: []};
    const result = onEditWith(variables, data);
    assert.deepEqual(result.propertiesToSave.map(p => p.name), ['j:view', 'cardSubtitle']);
    assert.deepEqual(result.propertiesToDelete, [{name: 'maxItems', language: 'en'}]);
});

test('a node that gets the mixin at instance level follows the rule', () => {
    const ctx = editCtx(CONTROL, {mixin: false, instanceMixin: true});
    onViewChange(undefined, 'x', {propertyName: 'ce:systemName'}, ctx);
    assert.deepEqual(visibility(ctx.sections), {maxItems: false});
});

test('the control type, without the mixin, hides and clears nothing', () => {
    const ctx = editCtx(CONTROL);
    assert.equal(onViewChange(undefined, 'x', {propertyName: 'ce:systemName'}, ctx), false);
    assert.deepEqual(visibility(ctx.sections), {maxItems: true});
    const variables = {language: 'en', propertiesToSave: [{name: 'maxItems', value: '4'}], propertiesToDelete: []};
    assert.equal(onEditWith(variables, nodeData(CONTROL, [['maxItems', '3']])), variables);
});

test('on create, the server answers whether the type holds the mixin, then the save drops the hidden values', async () => {
    const sections = formOf(DEMO);
    const asked = [];
    const fetchHasMixin = async type => {
        asked.push(type);
        return true;
    };
    const ctx = {mode: 'create', nodeTypeName: DEMO, sections, formik: {values: {}}, onSectionsUpdate: () => {}};
    assert.equal(await onViewChange(undefined, 'bullet', {propertyName: 'listStyle'}, ctx, fetchHasMixin), true);
    await onViewChange(undefined, 'x', {propertyName: 'ce:systemName'}, ctx, fetchHasMixin);
    assert.deepEqual(asked, [DEMO]);
    assert.equal(visibility(sections).listStyle, false);

    const base = {primaryNodeType: DEMO, properties: [{name: 'jcr:title', value: 't'}, {name: 'listStyle', value: 'bullet'}]};
    assert.deepEqual(onCreate(base).properties.map(p => p.name), ['jcr:title']);
    const list = {...base, properties: [...base.properties, {name: 'j:view', value: 'list'}]};
    assert.deepEqual(onCreate(list).properties.map(p => p.name), ['jcr:title', 'listStyle', 'j:view']);
});

test('on create of the control type, the server says no and nothing is dropped', async () => {
    const ctx = {mode: 'create', nodeTypeName: CONTROL, sections: formOf(CONTROL), formik: {values: {}}, onSectionsUpdate: () => {}};
    assert.equal(await onViewChange(undefined, 'x', {propertyName: 'ce:systemName'}, ctx, async () => false), false);
    const variables = {primaryNodeType: CONTROL, properties: [{name: 'maxItems', value: '2'}]};
    assert.equal(onCreate(variables), variables);
});

test('the unmount of j:view changes nothing', () => {
    assert.equal(onViewChange('card', undefined, {propertyName: 'j:view'}, editCtx(DEMO)), false);
});
