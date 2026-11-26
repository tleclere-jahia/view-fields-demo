import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hiddenProperties, onCreate, onEdit, onViewChange} from './viewFields.js';

const T = 'vfdnt:viewFieldsDemo';
const prop = (name, value) => ({name, value, definition: {declaringNodeType: {name: T}}});

test('the default view hides every managed property', () => {
    assert.deepEqual(hiddenProperties(T, undefined), ['cardSubtitle', 'cardImage', 'maxItems', 'listStyle']);
    assert.deepEqual(hiddenProperties(T, ''), ['cardSubtitle', 'cardImage', 'maxItems', 'listStyle']);
});

test('the card view hides the list properties only', () => {
    assert.deepEqual(hiddenProperties(T, 'card'), ['maxItems', 'listStyle']);
});

test('another type is left alone', () => {
    assert.deepEqual(hiddenProperties('jnt:text', 'card'), []);
    const variables = {propertiesToSave: [{name: 'text', value: 'x'}], propertiesToDelete: []};
    assert.equal(onEdit(variables, {primaryNodeType: {name: 'jnt:text'}}), variables);
});

test('on edit, a switch to card drops the list values and deletes the stored ones', () => {
    const nodeData = {
        primaryNodeType: {name: T},
        properties: [prop('j:view', 'list'), prop('maxItems', '5'), prop('listStyle', 'numbered'), prop('intro', 'hi')]
    };
    const variables = {
        language: 'en',
        propertiesToSave: [{name: 'j:view', value: 'card'}, {name: 'cardSubtitle', value: 'sub'}, {name: 'maxItems', value: '7'}],
        propertiesToDelete: []
    };
    const result = onEdit(variables, nodeData);
    assert.deepEqual(result.propertiesToSave.map(p => p.name), ['j:view', 'cardSubtitle']);
    assert.deepEqual(result.propertiesToDelete, [{name: 'maxItems', language: 'en'}, {name: 'listStyle', language: 'en'}]);
});

test('on edit with j:view unchanged, the stored view decides', () => {
    const nodeData = {primaryNodeType: {name: T}, properties: [prop('j:view', 'card'), prop('cardSubtitle', 'sub')]};
    const variables = {language: 'en', propertiesToSave: [{name: 'cardSubtitle', value: 'new'}, {name: 'maxItems', value: '3'}], propertiesToDelete: []};
    const result = onEdit(variables, nodeData);
    assert.deepEqual(result.propertiesToSave.map(p => p.name), ['cardSubtitle']);
    assert.deepEqual(result.propertiesToDelete, []);
});

test('on edit, removing j:view goes back to default and deletes every stored managed value', () => {
    const nodeData = {primaryNodeType: {name: T}, properties: [prop('j:view', 'card'), prop('cardSubtitle', 'sub')]};
    const variables = {language: 'en', propertiesToSave: [], propertiesToDelete: [{name: 'j:view', language: 'en'}]};
    const result = onEdit(variables, nodeData);
    assert.deepEqual(result.propertiesToDelete, [{name: 'j:view', language: 'en'}, {name: 'cardSubtitle', language: 'en'}]);
});

test('on create, the default listStyle is dropped unless the view is list', () => {
    const base = {primaryNodeType: T, properties: [{name: 'jcr:title', value: 't'}, {name: 'listStyle', value: 'bullet'}]};
    assert.deepEqual(onCreate(base, {}).properties.map(p => p.name), ['jcr:title']);
    const list = {...base, properties: [...base.properties, {name: 'j:view', value: 'list'}]};
    assert.deepEqual(onCreate(list, {}).properties.map(p => p.name), ['jcr:title', 'listStyle', 'j:view']);
});

test('a change of j:view only toggles visibility and keeps the values', () => {
    const field = (propertyName, visible) => ({name: `${T}_${propertyName}`, propertyName, nodeType: T, visible});
    const sections = [{name: 'content', fieldSets: [{name: T, fields: [field('intro', true), field('cardSubtitle', false), field('maxItems', false)]}]}];
    let updates = 0;
    const formik = {values: {[`${T}_maxItems`]: 4}};
    const ctx = {mode: 'edit', nodeData: {primaryNodeType: {name: T}}, sections, formik, onSectionsUpdate: () => updates++};
    assert.equal(onViewChange(undefined, 'card', {propertyName: 'j:view'}, ctx), true);
    const byName = Object.fromEntries(sections[0].fieldSets[0].fields.map(f => [f.propertyName, f.visible]));
    assert.deepEqual(byName, {intro: true, cardSubtitle: true, maxItems: false});
    assert.equal(updates, 1);
    assert.equal(formik.values[`${T}_maxItems`], 4);
    assert.equal(onViewChange('card', 'card', {propertyName: 'j:view'}, ctx), false);
});
