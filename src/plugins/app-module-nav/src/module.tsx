import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarContentOverrideComponent } from './nav/SidebarOverride';

export const SidebarContentOverride = NavContentBlueprint.make({
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
