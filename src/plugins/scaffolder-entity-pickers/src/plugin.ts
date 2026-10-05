import {
  FormFieldBlueprint,
  createFormField,
} from '@backstage/plugin-scaffolder-react/alpha';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ContextualEntityPicker } from './components/fields/ContextualEntityPicker/ContextualEntityPicker';
import { RequestUserCredentials } from './components/fields/RequestUserCredentials/RequestUserCredentials';


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

const SoRequestUserCredentialsFieldExtension = FormFieldBlueprint.make({
  name: 'so-request-user-credentials',
  params: {
    field: async () =>
      createFormField({
        name: 'SoRequestUserCredentials',
        component: RequestUserCredentials,
      }),
  },
});

export const soContextualEntityPickerModule = createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [
    SoContextualEntityPickerFieldExtension,
    SoRequestUserCredentialsFieldExtension,
  ],
});