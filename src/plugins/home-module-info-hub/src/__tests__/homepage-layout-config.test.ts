import fs from 'node:fs';
import path from 'node:path';

interface WidgetPosition {
  column: number;
  row: number;
}

function readAppConfig(): string {
  const appConfigPath = path.resolve(__dirname, '../../../../app-config.yaml');
  return fs.readFileSync(appConfigPath, 'utf8');
}

function readSection(config: string, startToken: string, endToken: string): string {
  const start = config.indexOf(startToken);
  if (start < 0) {
    throw new Error(`Unable to locate config section start token: ${startToken}`);
  }

  const end = config.indexOf(endToken, start);
  if (end < 0) {
    throw new Error(`Unable to locate config section end token: ${endToken}`);
  }

  return config.slice(start, end);
}

function parseLayoutPositions(config: string): {
  widgetOrder: string[];
  positions: Map<string, WidgetPosition>;
} {
  const section = readSection(config, 'defaultConfig:', '\n    # Catalog');
  const widgetPattern =
    /- component:\s+([A-Za-z0-9]+)\n\s+column:\s+(\d+)\n\s+row:\s+(\d+)/g;

  const widgetOrder: string[] = [];
  const positions = new Map<string, WidgetPosition>();

  for (const match of section.matchAll(widgetPattern)) {
    const component = match[1];
    widgetOrder.push(component);
    positions.set(component, {
      column: Number(match[2]),
      row: Number(match[3]),
    });
  }

  return { widgetOrder, positions };
}

function parseToolkitLinks(config: string): Map<string, string> {
  const section = readSection(
    config,
    '- home-page-widget:home/toolkit:',
    '\n    - home-page-widget:home/world-clock:',
  );
  const links = new Map<string, string>();
  const linkPattern = /- url:\s+(\S+)\n\s+label:\s+([^\n]+)/g;

  for (const match of section.matchAll(linkPattern)) {
    links.set(match[2], match[1]);
  }

  return links;
}

describe('Homepage layout config', () => {
  test('keeps required baseline widget grid positions', () => {
    const config = readAppConfig();
    const { widgetOrder, positions } = parseLayoutPositions(config);

    expect(widgetOrder[0]).toBe('HomePageSearchBar');

    const expectedPositions: Record<string, WidgetPosition> = {
      HomePageSearchBar: { column: 0, row: 0 },
      GettingStarted: { column: 0, row: 1 },
      HomePageStarredEntities: { column: 4, row: 2 },
      HomePageToolkit: { column: 4, row: 6 },
      HomePageLocalAndUtcClock: { column: 8, row: 6 },
      HomePageMostVisited: { column: 4, row: 9 },
      HomePageRecentlyVisited: { column: 8, row: 9 },
    };

    for (const [widgetId, expected] of Object.entries(expectedPositions)) {
      expect(positions.get(widgetId)).toEqual(expected);
    }
  });

  test('contains required toolkit destinations', () => {
    const config = readAppConfig();
    const links = parseToolkitLinks(config);

    const requiredToolkitLinks = new Map<string, string>([
      ['AWS', 'https://serverlessops.awsapps.com/start/#/'],
      ['GitHub', 'https://github.com/ServerlessOpsIO'],
      ['Datadog', 'https://us5.datadoghq.com/account/login'],
      ['Google Workspace', 'https://admin.google.com'],
    ]);

    expect(links.size).toBe(requiredToolkitLinks.size);

    for (const [label, url] of requiredToolkitLinks.entries()) {
      expect(links.get(label)).toBe(url);
    }
  });
});
