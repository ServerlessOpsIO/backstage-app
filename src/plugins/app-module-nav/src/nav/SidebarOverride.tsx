import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';

export const SidebarContentOverrideComponent = ({ navItems }: { navItems: any }) => {
  const nav = navItems.withComponent((item: any) => (
    <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
  ));

  nav.take('page:search');
  nav.take('page:api-docs');
  nav.take('page:notifications');
  nav.take('page:catalog-import');

  return (
    <Sidebar>
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {nav.take('page:catalog')}
        {nav.take('page:catalog-graph')}
        {nav.take('page:scaffolder')}
        <SidebarDivider />
        <SidebarScrollWrapper>
          {nav.take('page:serverlessops-catalog/serverlessops-catalog-tabbed-directory-index')}
          {nav.rest({ sortBy: 'title' })}
        </SidebarScrollWrapper>
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <NotificationsSidebarItem />
      <SidebarDivider />
      <SidebarGroup
        label="Settings"
        icon={<UserSettingsSignInAvatar />}
        to="/settings"
      >
        {nav.take('page:catalog-unprocessed-entities')}
        {nav.take('page:app-visualizer')}
        {nav.take('page:user-settings')}
      </SidebarGroup>
    </Sidebar>
  );
}
