import {
  FormFieldBlueprint,
  createFormField,
} from '@backstage/plugin-scaffolder-react/alpha';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ContextualEntityPicker } from './components/fields/ContextualEntityPicker/ContextualEntityPicker';


const SoContextualEntityPickerFieldExtension = FormFieldBlueprint.make({
  name: 'so-contextual-entity-picker',
  params: {
    field: async () =>
      createFormField({
        name: 'SoContextualEntityPicker',
        component: ContextualEntityPicker,
      }),
  },
});

export const soContextualEntityPickerModule = createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [SoContextualEntityPickerFieldExtension],
});