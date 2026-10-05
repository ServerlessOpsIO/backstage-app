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
import { useApi } from '@backstage/core-plugin-api';
import { scmAuthApiRef } from '@backstage/integration-react';
import { useTemplateSecrets } from '@backstage/plugin-scaffolder-react';
import { useEffect, useMemo } from 'react';

import { RequestUserCredentialsProps } from './schema';

function resolveHost(formData: string | undefined, hostOption: string | undefined) {
  if (hostOption) {
    return hostOption;
  }

  if (!formData) {
    return undefined;
  }

  if (formData.includes('://')) {
    try {
      return new URL(formData).host;
    } catch {
      return undefined;
    }
  }

  const [host] = formData.split('?');
  return host || undefined;
}

export const RequestUserCredentials = (props: RequestUserCredentialsProps) => {
  const scmAuthApi = useApi(scmAuthApiRef);
  const { secrets, setSecrets } = useTemplateSecrets();
  const requestConfig = props.uiSchema['ui:options']?.requestUserCredentials;
  const host = useMemo(
    () =>
      resolveHost(
        props.formData,
        props.uiSchema['ui:options']?.host,
      ),
    [props.formData, props.uiSchema],
  );

  useEffect(() => {
    props.onChange(props.formData ?? '');
  }, [props.formData, props.onChange]);

  useEffect(() => {
    let mounted = true;

    if (!requestConfig || !host) {
      return () => {
        mounted = false;
      };
    }

    if (secrets[requestConfig.secretsKey]) {
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      try {
        const { token } = await scmAuthApi.getCredentials({
          url: `https://${host}`,
          additionalScope: {
            repoWrite: true,
            customScopes: requestConfig.additionalScopes,
          },
        });

        if (!mounted || !token) {
          return;
        }

        setSecrets({ [requestConfig.secretsKey]: token });
      } catch (error) {
        if (mounted) {
          console.error(
            `Failed to request credentials for host "${host}"`,
            error,
          );
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [host, requestConfig, scmAuthApi, secrets, setSecrets]);

  return null;
};
