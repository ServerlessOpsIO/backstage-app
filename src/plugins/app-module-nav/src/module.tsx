import { createFrontendModule, ExtensionDefinition } from '@backstage/frontend-plugin-api';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarContentOverrideComponent } from './nav/SidebarOverride';

export const SidebarContentOverride: ExtensionDefinition<any> = NavContentBlueprint.make({
  params: {
    component: ({ navItems }: { navItems: any }) => (
      <SidebarContentOverrideComponent navItems={navItems} />
    ),
  },
});

export const appModuleNav = createFrontendModule({
  pluginId: 'app',
  extensions: [
    SidebarContentOverride,
  ],
});
