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

import { readFileSync } from 'node:fs'
import { describe, expect, it } from '@jest/globals'

const template = readFileSync(
  new URL('../../../../../template.yaml', import.meta.url),
  'utf8',
)

function getResourceBlock(logicalId: string): string {
  const start = template.indexOf(`  ${logicalId}:\n`)
  expect(start).toBeGreaterThanOrEqual(0)

  const nextResource = /\n  [A-Za-z][A-Za-z0-9]*:\n/g
  nextResource.lastIndex = start + 1
  const next = nextResource.exec(template)
  return template.slice(start, next?.index)
}

describe('catalog event queue discovery parameters', () => {
  it('publishes the name, URL, and ARN of the same FIFO queue', () => {
    const queue = getResourceBlock('CatalogEventsQueue')
    const arnParameter = getResourceBlock('CatalogEventsQueueArnParameter')
    const nameParameter = getResourceBlock('CatalogEventsQueueNameParameter')
    const urlParameter = getResourceBlock('CatalogEventsQueueUrlParameter')

    expect(queue).toContain('FifoQueue: true')
    expect(arnParameter).toContain('Value: !GetAtt CatalogEventsQueue.Arn')
    expect(nameParameter).toContain('Value: !GetAtt CatalogEventsQueue.QueueName')
    expect(urlParameter).toContain('Value: !Ref CatalogEventsQueue')
  })
})
