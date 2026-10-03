import {
  FormFieldBlueprint,
  createFormField,
} from '@backstage/plugin-scaffolder-react/alpha';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ContextualEntityPicker } from './components/fields/ContextualEntityPicker/ContextualEntityPicker';
import { EntityPickerFieldSchema } from './components/fields/ContextualEntityPicker';
import { RequestUserCredentials } from './components/fields/RequestUserCredentials/RequestUserCredentials';
import { RequestUserCredentialsFieldSchema } from './components/fields/RequestUserCredentials/schema';


const SoContextualEntityPickerFieldExtension = FormFieldBlueprint.make({
  name: 'so-contextual-entity-picker',
  params: {
    field: async () =>
      createFormField({
        name: 'SoContextualEntityPicker',
        component: ContextualEntityPicker,
        schema: EntityPickerFieldSchema,
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
        schema: RequestUserCredentialsFieldSchema,
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