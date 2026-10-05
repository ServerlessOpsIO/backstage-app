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
import { z } from 'zod';
import { makeFieldSchemaFromZod } from '../../../utils';

export const RequestUserCredentialsFieldSchema = makeFieldSchemaFromZod(
  z.string().optional(),
  z.object({
    host: z
      .string()
      .optional()
      .describe('SCM host to request credentials for, for example github.com'),
    requestUserCredentials: z
      .object({
        secretsKey: z.string(),
        additionalScopes: z
          .object({
            azure: z.array(z.string()).optional(),
            github: z.array(z.string()).optional(),
            gitlab: z.array(z.string()).optional(),
            bitbucket: z.array(z.string()).optional(),
            gerrit: z.array(z.string()).optional(),
            gitea: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
);

export type RequestUserCredentialsProps =
  typeof RequestUserCredentialsFieldSchema.type;
