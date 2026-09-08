import { SidebarContentOverrideComponent } from './SidebarOverride';

jest.mock('@backstage/core-components', () => ({
  Sidebar: ({ children }: any) => <div>{children}</div>,
  SidebarDivider: () => <div />,
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarItem: ({ text }: any) => <div>{text}</div>,
  SidebarScrollWrapper: ({ children }: any) => <div>{children}</div>,
  SidebarSpace: () => <div />,
}));

jest.mock('@backstage/plugin-search', () => ({ SidebarSearchModal: () => <div>Search</div> }));
jest.mock('@backstage/plugin-user-settings', () => ({ UserSettingsSignInAvatar: () => <div>Settings</div> }));
jest.mock('@backstage/plugin-notifications', () => ({ NotificationsSidebarItem: () => <div>Notifications</div> }));

describe('SidebarContentOverrideComponent', () => {
  it('removes the hidden navigation items before rendering the sidebar', () => {
    const take = jest.fn(() => null);
    const rest = jest.fn(() => []);

    const navItems = {
      withComponent: jest.fn(() => ({ take, rest })),
    } as any;

    // I don't feel like pulling in react testing library just for a capitalization issue.
    const renderSidebar = SidebarContentOverrideComponent;
    renderSidebar({ navItems });

    expect(take).toHaveBeenCalledWith('page:search');
    expect(take).toHaveBeenCalledWith('page:api-docs');
    expect(take).toHaveBeenCalledWith('page:notifications');
    expect(take).toHaveBeenCalledWith('page:catalog-import');
  });
});
