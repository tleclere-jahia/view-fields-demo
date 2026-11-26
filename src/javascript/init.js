import {registry} from '@jahia/ui-extender';
import {registerViewFields} from './viewFields';

export default function () {
    registry.add('callback', 'viewFieldsDemo', {
        targets: ['jahiaApp-init:60'],
        callback: () => registerViewFields(registry)
    });
}
