/**
 * @jest-environment node
 */

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

import express from 'express';
import request from 'supertest';
import { ConfigReader } from '@backstage/config';
import { mockCredentials, mockServices } from '@backstage/backend-test-utils';
import { createDatadogRouter } from './plugin';

function setup() {
  const searchMonitors = jest.fn().mockResolvedValue({
    monitors: [{ id: 42, name: 'API errors', status: 'Alert' }],
    metadata: { totalCount: 6 },
  });
  const getMonitor = jest.fn().mockResolvedValue({ priority: 1 });
  const logger = mockServices.logger.mock();
  const app = express().use(
    createDatadogRouter({
      config: new ConfigReader({
        integrations: {
          datadog: {
            server: 'us5.datadoghq.com',
            authMethods: {
              apiKeyAuth: 'test-api-key',
              appKeyAuth: 'test-app-key',
            },
          },
        },
        home: { datadog: { query: 'status:Alert tag:env:production' } },
      }),
      httpAuth: mockServices.httpAuth({
        defaultCredentials: mockCredentials.none(),
      }),
      logger,
      monitorsApi: { searchMonitors, getMonitor },
    }),
  );
  return { app, searchMonitors, getMonitor, logger };
}

describe('Datadog monitors endpoint', () => {
  it('requires user authentication and validates pages before querying Datadog', async () => {
    const { app, searchMonitors } = setup();
    expect((await request(app).get('/monitors')).status).not.toBe(200);
    for (const page of ['-1', '1.5', 'invalid', '9007199254740992']) {
      await request(app)
        .get(`/monitors?page=${page}`)
        .auth(mockCredentials.user.token(), { type: 'bearer' })
        .expect(400);
    }
    expect(searchMonitors).not.toHaveBeenCalled();
  });

  it('uses the configured query and paging, returns priorities and never exposes keys', async () => {
    const { app, searchMonitors, getMonitor } = setup();
    const response = await request(app)
      .get('/monitors?page=1')
      .auth(mockCredentials.user.token(), { type: 'bearer' })
      .expect(200);
    expect(searchMonitors).toHaveBeenCalledWith({
      query:
        '(status:Alert tag:env:production) AND (status:Alert OR status:Warn)',
      page: 1,
      perPage: 5,
      sort: 'name,asc',
    });
    expect(getMonitor).toHaveBeenCalledWith({ monitorId: 42 });
    expect(response.body).toEqual({
      items: [
        {
          id: 42,
          name: 'API errors',
          status: 'Alert',
          priority: 1,
          url: 'https://us5.datadoghq.com/monitors/42',
        },
      ],
      totalCount: 6,
    });
    expect(response.text).not.toContain('test-api-key');
    expect(response.text).not.toContain('test-app-key');
  });

  it('handles empty results and missing priority, and logs sanitized upstream failures', async () => {
    const { app, searchMonitors, getMonitor, logger } = setup();
    getMonitor.mockResolvedValue({});
    const result = await request(app)
      .get('/monitors')
      .auth(mockCredentials.user.token(), { type: 'bearer' })
      .expect(200);
    expect(result.body.items[0].priority).toBeNull();
    searchMonitors.mockResolvedValue({
      monitors: [],
      metadata: { totalCount: 0 },
    });
    const empty = await request(app)
      .get('/monitors')
      .auth(mockCredentials.user.token(), { type: 'bearer' })
      .expect(200);
    expect(empty.body).toEqual({ items: [], totalCount: 0 });
    searchMonitors.mockRejectedValue(new Error('upstream test-api-key'));
    const failure = await request(app)
      .get('/monitors')
      .auth(mockCredentials.user.token(), { type: 'bearer' })
      .expect(502);
    expect(failure.text).not.toContain('test-api-key');
    expect(logger.warn).toHaveBeenCalledWith('Unable to load Datadog monitors');
  });
});
