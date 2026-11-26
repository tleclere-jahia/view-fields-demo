// For each node type: the properties that depend on j:view, and the ones each view shows.
// A managed property that the selected view does not list is hidden in the form and cleared on save.
// No j:view value means the default view.
export const RULES = {
    'vfdnt:viewFieldsDemo': {
        managed: ['cardSubtitle', 'cardImage', 'maxItems', 'listStyle'],
        views: {
            card: ['cardSubtitle', 'cardImage'],
            list: ['maxItems', 'listStyle']
        }
    }
};
