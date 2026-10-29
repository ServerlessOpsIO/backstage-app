/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { amber, green, grey, red } from '@material-ui/core/colors';
import {
  DatadogMonitorsWidget,
  DatadogMonitorsWidgetRenderer,
} from './datadog-monitors-widget';

function render(fetch: jest.Mock) {
  return renderInTestApp(
    <DatadogMonitorsWidgetRenderer
      title="Datadog Monitors"
      Content={DatadogMonitorsWidget}
    />,
    {
      apis: [
        [
          discoveryApiRef,
          { getBaseUrl: async () => 'http://localhost/api/datadog' },
        ],
        [fetchApiRef, { fetch }],
      ],
    },
  );
}

describe('DatadogMonitorsWidget', () => {
  it('renders standard table columns with five monitors and loads subsequent pages', async () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      name: `Monitor ${index + 1}`,
      priority: index === 0 ? null : index,
      status: ['Warn', 'Alert', 'OK', 'No Data', 'Unknown'][index],
      url: `https://us5.datadoghq.com/monitors/${index + 1}`,
    }));
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items, totalCount: 6 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ ...items[1], id: 6, name: 'Monitor 6' }],
          totalCount: 6,
        }),
      });
    render(fetch);
    expect(await screen.findByText('Monitor 5')).toBeVisible();
    const [table] = screen.getAllByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(header => header.textContent),
    ).toEqual(['Priority', 'Status', 'Name']);
    expect(screen.getByText('Not set')).toBeVisible();
    expect(screen.getByText('P1')).toBeVisible();
    expect(screen.getByText('Warn')).toBeVisible();
    for (const [status, color] of [
      ['Alert', red[700]],
      ['OK', green[700]],
      ['No Data', grey[600]],
      ['Warn', amber[500]],
    ]) {
      expect(screen.getByText(status).closest('.MuiChip-root')).toHaveStyle({
        backgroundColor: color,
      });
    }
    expect(screen.getByRole('link', { name: /^Monitor 1/ })).toHaveAttribute(
      'href',
      items[0].url,
    );
    expect(table.closest('.MuiPaper-root')).toHaveClass('MuiCard-root');
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('Monitor 6')).toBeVisible();
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost/api/datadog/monitors?page=1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('shows explicit empty and error states', async () => {
    const empty = render(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], totalCount: 0 }),
      }),
    );
    expect(
      await screen.findByText(
        'No monitors match the configured Datadog query.',
      ),
    ).toBeVisible();
    empty.unmount();
    render(jest.fn().mockResolvedValue({ ok: false, status: 502 }));
    expect(
      await screen.findByText(
        'Datadog monitor data is currently unavailable: HTTP 502',
      ),
    ).toBeVisible();
  });
});
