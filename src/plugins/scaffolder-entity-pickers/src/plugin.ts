import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';

import { ContextualEntityPicker } from './components/fields/ContextualEntityPicker/ContextualEntityPicker';

export const SoContextualEntityPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'SoContextualEntityPicker',
    component: ContextualEntityPicker,
  }),
);