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

import {
  coreServices,
  createBackendPlugin,
  HttpAuthService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { client, v1 } from '@datadog/datadog-api-client';
import { Router } from 'express';

export function createDatadogRouter(options: {
  config: Config;
  httpAuth: HttpAuthService;
  logger: LoggerService;
  monitorsApi?: Pick<v1.MonitorsApi, 'searchMonitors' | 'getMonitor'>;
}) {
  const { config, httpAuth, logger } = options;
  const site = config.getString('integrations.datadog.server');
  const configuration = client.createConfiguration({
    authMethods: {
      apiKeyAuth: config.getString(
        'integrations.datadog.authMethods.apiKeyAuth',
      ),
      appKeyAuth: config.getString(
        'integrations.datadog.authMethods.appKeyAuth',
      ),
    },
  });
  configuration.setServerVariables({ site });
  const monitorsApi = options.monitorsApi ?? new v1.MonitorsApi(configuration);
  const query = config.getString('home.datadog.query');
  const monitorBaseUrl = `https://${
    site === 'datadoghq.com' ? 'app.datadoghq.com' : site
  }/monitors/`;
  const router = Router();

  router.get('/monitors', (req, res, next) => {
    httpAuth
      .credentials(req, { allow: ['user'] })
      .then(async () => {
        const pageValue = req.query.page ?? '0';
        if (
          typeof pageValue !== 'string' ||
          !/^\d+$/.test(pageValue) ||
          !Number.isSafeInteger(Number(pageValue))
        ) {
          res
            .status(400)
            .json({ error: 'page must be a non-negative integer' });
          return;
        }
        try {
          const page = await monitorsApi.searchMonitors({
            query: `(${query}) AND (status:Alert OR status:Warn)`,
            page: Number(pageValue),
            perPage: 5,
            sort: 'name,asc',
          });
          if (!page.monitors || page.metadata?.totalCount === undefined) {
            throw new Error('Invalid Datadog search response');
          }
          const items = await Promise.all(
            page.monitors.map(async monitor => {
              if (
                monitor.id === undefined ||
                !monitor.name ||
                !monitor.status
              ) {
                throw new Error('Invalid Datadog monitor response');
              }
              // Monitor search results do not include priority.
              const details = await monitorsApi.getMonitor({
                monitorId: monitor.id,
              });
              return {
                id: monitor.id,
                priority: details.priority ?? null,
                status: monitor.status,
                name: monitor.name,
                url: `${monitorBaseUrl}${monitor.id}`,
              };
            }),
          );
          res.json({ items, totalCount: page.metadata.totalCount });
        } catch {
          logger.warn('Unable to load Datadog monitors');
          res
            .status(502)
            .json({
              error:
                'Datadog monitor data is currently unavailable. Check backend configuration and Datadog access.',
            });
        }
      })
      .catch(next);
  });
  return router;
}

export default createBackendPlugin({
  pluginId: 'datadog',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ config, httpAuth, httpRouter, logger }) {
        httpRouter.use(createDatadogRouter({ config, httpAuth, logger }));
      },
    });
  },
});
