/*
 * Copyright 2021 The Backstage Authors
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
import { CatalogTableRow } from '@backstage/plugin-catalog'
import {
  humanizeEntityRef,
  EntityRefLink,
  EntityRefLinks,
} from '@backstage/plugin-catalog-react';
import Chip from '@material-ui/core/Chip';
import { OverflowTooltip, TableColumn } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { JsonArray } from '@backstage/types';

// The columnFactories symbol is not directly exported, but through the
// CatalogTable.columns field.
/** @public */
export const columnFactories = Object.freeze({
  createNameColumn(options?: {
    defaultKind?: string;
    width?: string;
  }): TableColumn<CatalogTableRow> {
    function formatContent(entity: Entity): string {
      return (
        entity.metadata?.title ||
        humanizeEntityRef(entity, {
          defaultKind: options?.defaultKind,
        })
      );
    }

    return {
      title: 'Name',
      field: 'resolved.entityRef',
      highlight: true,
      width: options?.width || 'auto',
      customSort({ entity: entity1 }, { entity: entity2 }) {
        // TODO: We could implement this more efficiently by comparing field by field.
        // This has similar issues as above.
        return formatContent(entity1).localeCompare(formatContent(entity2));
      },
      render: ({ entity }) => (
        <EntityRefLink
          entityRef={entity}
          defaultKind={options?.defaultKind || 'Component'}
        />
      ),
    };
  },
  createSystemColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'System',
      field: 'resolved.partOfSystemRelationTitle',
      width: options?.width,
      render: ({ resolved }) => (
        <EntityRefLinks
          entityRefs={resolved.partOfSystemRelations}
          defaultKind="system"
        />
      ),
    };
  },
  createOwnerColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Owner',
      field: 'resolved.ownedByRelationsTitle',
      width: options?.width,
      render: ({ resolved }) => (
        <EntityRefLinks
          entityRefs={resolved.ownedByRelations}
          defaultKind="group"
        />
      ),
    };
  },
  createSpecTargetsColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Targets',
      field: 'entity.spec.targets',
      width: options?.width,
      customFilterAndSearch: (query, row) => {
        let targets: JsonArray = [];
        if (
          row.entity?.spec?.targets &&
          Array.isArray(row.entity?.spec?.targets)
        ) {
          targets = row.entity?.spec?.targets;
        } else if (row.entity?.spec?.target) {
          targets = [row.entity?.spec?.target];
        }
        return targets
          .join(', ')
          .toLocaleUpperCase('en-US')
          .includes(query.toLocaleUpperCase('en-US'));
      },
      render: ({ entity }) => (
        <>
          {(entity?.spec?.targets || entity?.spec?.target) && (
            <OverflowTooltip
              text={(
                (entity!.spec!.targets as JsonArray) || [entity.spec.target]
              ).join(', ')}
              placement="bottom-start"
            />
          )}
        </>
      ),
    };
  },
  createSpecTypeColumn(
    options?: {
      hidden?: boolean;
      width?: string;
    }
  ): TableColumn<CatalogTableRow> {
    return {
      title: 'Type',
      field: 'entity.spec.type',
      hidden: options?.hidden,
      width: options?.width || 'auto',
    };
  },
  createSpecLifecycleColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Lifecycle',
      field: 'entity.spec.lifecycle',
      width: options?.width,
    };
  },
  createSpecEmailColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Email',
      field: 'entity.spec.profile.email',
      width: options?.width,
    };
  },
  createMetadataDescriptionColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Description',
      field: 'entity.metadata.description',
      render: ({ entity }) => (
        <OverflowTooltip
          text={entity.metadata.description}
          placement="bottom-start"
        />
      ),
      width: options?.width || 'auto'
    };
  },
  createTagsColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Tags',
      field: 'entity.metadata.tags',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {entity.metadata.tags &&
            entity.metadata.tags.map(t => (
              <Chip
                key={t}
                label={t}
                size="small"
                variant="outlined"
                style={{ marginBottom: '0px' }}
              />
            ))}
        </>
      ),
      width: options?.width || 'auto',
    };
  },
  createTitleColumn(options?: {
    hidden?: boolean;
    width?: string;
  }): TableColumn<CatalogTableRow> {
    return {
      title: 'Title',
      field: 'entity.metadata.title',
      hidden: options?.hidden,
      searchable: true,
      width: options?.width,
    };
  },
  createLabelColumn(
    key: string,
    options?: { title?: string; defaultValue?: string, width?: string },
  ): TableColumn<CatalogTableRow> {
    function formatContent(keyLabel: string, entity: Entity): string {
      const labels: Record<string, string> | undefined =
        entity.metadata?.labels;
      return (labels && labels[keyLabel]) || '';
    }

    return {
      title: options?.title || 'Label',
      field: 'entity.metadata.labels',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      customSort({ entity: entity1 }, { entity: entity2 }) {
        return formatContent(key, entity1).localeCompare(
          formatContent(key, entity2),
        );
      },
      render: ({ entity }: { entity: Entity }) => {
        const labels: Record<string, string> | undefined =
          entity.metadata?.labels;
        const specifiedLabelValue =
          (labels && labels[key]) || options?.defaultValue;
        return (
          <>
            {specifiedLabelValue && (
              <Chip
                key={specifiedLabelValue}
                label={specifiedLabelValue}
                size="small"
                variant="outlined"
              />
            )}
          </>
        );
      },
      width: options?.width || 'auto',
    };
  },
  createNamespaceColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Namespace',
      field: 'entity.metadata.namespace',
      width: options?.width,
    };
  },
  createUsernameColumn(options?: { width?: string }): TableColumn<CatalogTableRow> {
    return {
      title: 'Username',
      field: 'entity.metadata.name',
      width: options?.width,
    };
  },
});
