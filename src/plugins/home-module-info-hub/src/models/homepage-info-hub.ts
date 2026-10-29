export interface HomepageWidgetDefinition {
  id: string;
  title: string;
  column: number;
  row: number;
  width: number;
  height: number;
}

export interface LayoutVariant {
  id: string;
  description: string;
  widgets: HomepageWidgetDefinition[];
}

export interface ToolkitLink {
  label: string;
  url: string;
  icon?: string;
}

export const REQUIRED_INFO_HUB_WIDGET_IDS = Object.freeze([
  'HomePageSearchBar',
  'HomePageToolkit',
  'HomePageLocalAndUtcClock',
  'HomePageGitHubOpenedIssues',
  'HomePageGitHubAssignedIssues',
  'HomePageGitHubOpenedPrs',
  'HomePageGitHubReviewRequestedPrs',
  'HomePageGoogleCalendarToday',
] as const);

export function assertUniqueWidgetIds(widgets: HomepageWidgetDefinition[]): void {
  const visited = new Set<string>();

  for (const widget of widgets) {
    if (visited.has(widget.id)) {
      throw new Error('`id` must be unique within one layout variant.');
    }
    visited.add(widget.id);
  }
}

export function assertToolkitLinks(links: ToolkitLink[]): void {
  for (const link of links) {
    if (!link.url.startsWith('https://')) {
      throw new Error('URL must be `https://`.');
    }
  }
}

export function assertRequiredWidgetsPresent(widgets: HomepageWidgetDefinition[]): void {
  const widgetIds = new Set(widgets.map(widget => widget.id));

  const missing = REQUIRED_INFO_HUB_WIDGET_IDS.filter(requiredId => !widgetIds.has(requiredId));
  if (missing.length > 0) {
    throw new Error(
      `All required widgets from FR-001..FR-013 must be present in every published layout variant. Missing: ${missing.join(', ')}`,
    );
  }
}

export function validateLayoutVariant(variant: LayoutVariant): void {
  assertUniqueWidgetIds(variant.widgets);
  assertRequiredWidgetsPresent(variant.widgets);
}
