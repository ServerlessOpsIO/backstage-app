import { Grid } from '@backstage/ui'
import {
  EntityDependencyOfComponentsCard,
  EntityDependsOnResourcesCard,
  EntityDependsOnComponentsCard,
  EntityHasComponentsCard,
  EntityHasResourcesCard,
  EntityHasSystemsCard,
  EntitySwitch,
} from '@backstage/plugin-catalog'
import {
  entityDataTableColumns,
  EntityColumnConfig,
  EntityRelationCard
} from '@backstage/plugin-catalog-react/alpha'
import {
  EntityCatalogGraphCard,
  Direction
} from '@backstage/plugin-catalog-graph'


export const entityCardPresets = {
  domain: {
    taxonomy: () => {
      return (
        <>
        {/* We don't use subdomains so disabling. Leaving here as an artifact if needed later
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Domain"
              entityKind="Domain"
              relationType="partOf"
              columnConfig={entityColumnPresets.domain.columns}
              emptyState={{
                message: 'No parent domain',
                helpLink: entityColumnPresets.domain.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityHasSubdomainsCard
              title="Subdomains"
              columnConfig={entityColumnPresets.domain.columns}
            />
          </Grid.Item>
        */}
          <Grid.Item colSpan="12">
            <EntityHasSystemsCard
              title="Systems"
              columnConfig={entityColumnPresets.system.columns}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
        </>
      )
    }
  },
  system: {
    taxonomy: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Domain"
              entityKind="Domain"
              relationType="partOf"
              columnConfig={entityColumnPresets.domain.columns}
              emptyState={{
                message: 'Missing parent domain.',
                helpLink: entityColumnPresets.domain.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityHasComponentsCard
              title="Components"
              columnConfig={entityColumnPresets.component.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityHasResourcesCard
              title="Resources"
              columnConfig={entityColumnPresets.resource.columns}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
        </>
      )
    }
  },
  component: {
    taxonomy: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="System"
              entityKind="System"
              relationType="partOf"
              columnConfig={entityColumnPresets.system.columns}
              emptyState={{
                message: 'Part of no systems.',
                helpLink: entityColumnPresets.system.helpLink,
              }}
            />
          </Grid.Item>
        {/* We don;'t make use of subcomponents. Leaving here as artifact if that changes.
          <Grid.Item colSpan="12">
            <EntityHasSubcomponentsCard
              title="Subcomponents"
              columnConfig={entityColumnPresets.component.columns}
            />
          </Grid.Item>
        */}
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="APIs"
              entityKind="API"
              relationType="providesApi"
              columnConfig={entityColumnPresets.api.columns}
              emptyState={{
                message: 'No APIs owned by entity.',
                helpLink: entityColumnPresets.api.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityDependsOnResourcesCard
              title="Depends on resources"
              columnConfig={entityColumnPresets.resource.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityDependsOnComponentsCard
              title="Depends on components"
              columnConfig={entityColumnPresets.component.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityDependencyOfComponentsCard
              title="Dependency of components"
              columnConfig={entityColumnPresets.component.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Dependency of resources"
              entityKind="Resource"
              relationType="dependencyOf"
              columnConfig={entityColumnPresets.resource.columns}
              emptyState={{
                message: 'No resources depend on this component.',
                helpLink: entityColumnPresets.resource.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Consumes APIs"
              entityKind="API"
              relationType="consumesApi"
              columnConfig={entityColumnPresets.api.columns}
              emptyState={{
                message: 'Component consumes no APIs.',
                helpLink: entityColumnPresets.api.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    }
  },
  resource: {
    taxonomy: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="System"
              entityKind="System"
              relationType="partOf"
              columnConfig={entityColumnPresets.system.columns}
              emptyState={{
                message: 'Part of no systems.',
                helpLink: entityColumnPresets.system.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityDependsOnResourcesCard
              title="Depends on resources"
              columnConfig={entityColumnPresets.resource.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityDependsOnComponentsCard
              title="Depends on components"
              columnConfig={entityColumnPresets.component.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityDependencyOfComponentsCard
              title="Dependency of components"
              columnConfig={entityColumnPresets.component.columns}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Dependency of resources"
              entityKind="Resource"
              relationType="dependencyOf"
              columnConfig={entityColumnPresets.resource.columns}
              emptyState={{
                message: 'No resources depend on this component.',
                helpLink: entityColumnPresets.resource.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    }
  },
  api: {
    taxonomy: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="System"
              entityKind="System"
              relationType="partOf"
              columnConfig={entityColumnPresets.system.columns}
              emptyState={{
                message: 'Part of no systems.',
                helpLink: entityColumnPresets.system.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Component"
              entityKind="Component"
              relationType="apiProvidedBy"
              columnConfig={entityColumnPresets.component.columns}
              emptyState={{
                message: 'API provided by no component.',
                helpLink: entityColumnPresets.component.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="API Consumers"
              entityKind="Component"
              relationType="apiConsumedBy"
              columnConfig={entityColumnPresets.component.columns}
              emptyState={{
                message: 'API consumed by no component',
                helpLink: entityColumnPresets.component.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    }
  },
  user: {
    taxonomy: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Domain ownership"
              entityKind="Domain"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.domain.columns}
              emptyState={{
                message: 'No domains owned by entity.',
                helpLink: entityColumnPresets.domain.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="System ownership"
              entityKind="System"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.system.columns}
              emptyState={{
                message: 'No systems owned by entity.',
                helpLink: entityColumnPresets.system.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Component ownership"
              entityKind="Component"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.component.columns}
              emptyState={{
                message: 'No components owned by entity.',
                helpLink: entityColumnPresets.component.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Resource ownership"
              entityKind="Resource"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.resource.columns}
              emptyState={{
                message: 'No resources owned by entity.',
                helpLink: entityColumnPresets.resource.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Groups"
              entityKind="Group"
              relationType="memberOf"
              columnConfig={entityColumnPresets.generic.columns}
              emptyState={{
                message: 'Member of no groups',
                helpLink: entityColumnPresets.generic.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    }
  },
  group: {
    taxonomy: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Domain ownership"
              entityKind="Domain"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.domain.columns}
              emptyState={{
                message: 'No domains owned by entity.',
                helpLink: entityColumnPresets.domain.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="System ownership"
              entityKind="System"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.system.columns}
              emptyState={{
                message: 'No systems owned by entity.',
                helpLink: entityColumnPresets.system.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Component ownership"
              entityKind="Component"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.component.columns}
              emptyState={{
                message: 'No components owned by entity.',
                helpLink: entityColumnPresets.component.helpLink,
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Resource ownership"
              entityKind="Resource"
              relationType="ownerOf"
              columnConfig={entityColumnPresets.resource.columns}
              emptyState={{
                message: 'No resources owned by entity.',
                helpLink: entityColumnPresets.resource.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    },
    dependants: () => {
      return (
        <>
          <Grid.Item colSpan="12">
            <EntityRelationCard
              title="Members"
              entityKind="User"
              relationType="hasMember"
              columnConfig={entityColumnPresets.user.columns}
              emptyState={{
                message: 'No members found for this group.',
                helpLink: entityColumnPresets.user.helpLink,
              }}
            />
          </Grid.Item>
        </>
      )
    }
  },
} as const

export const entityColumnPresets = {
  component: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({ defaultKind: 'component' }),
      entityDataTableColumns.createSpecTypeColumn(),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format#kind-component',
  },
  resource: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({ defaultKind: 'resource' }),
      entityDataTableColumns.createSpecTypeColumn(),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format#kind-resource',
  },
  system: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({ defaultKind: 'system' }),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format#kind-system',
  },
  domain: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({ defaultKind: 'domain' }),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format#kind-domain',
  },
  api: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({ defaultKind: 'api' }),
      entityDataTableColumns.createSpecTypeColumn(),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format#kind-api',
  },
  group: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({}),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format',
  },
  user: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({}),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format',
  },
  generic: {
    columns: [
      entityDataTableColumns.createEntityRefColumn({}),
      entityDataTableColumns.createMetadataDescriptionColumn(),
    ] as EntityColumnConfig[],
    helpLink:
      'https://backstage.io/docs/features/software-catalog/descriptor-format',
  }
} as const;


export const RelationsCatalogEntityContent = () => {
  return(
    <Grid.Root columns="12" >

      {/* relationships */}
      <Grid.Item colSpan="12">

        <Grid.Root columns="12" gap="4">
          <Grid.Item colSpan="6">
            <Grid.Root columns="12" gap="4">
              <EntitySwitch>
                <EntitySwitch.Case if={entity => entity.kind === 'Domain'}>
                  { entityCardPresets.domain.taxonomy() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'System'}>
                  { entityCardPresets.system.taxonomy() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'Component'}>
                  { entityCardPresets.component.taxonomy() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'Resource'}>
                  { entityCardPresets.resource.taxonomy() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'API'}>
                  { entityCardPresets.api.taxonomy() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'User'}>
                  { entityCardPresets.user.taxonomy() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'Group'}>
                  { entityCardPresets.group.taxonomy() }
                </EntitySwitch.Case>
              </EntitySwitch>
            </Grid.Root>
          </Grid.Item>

          <Grid.Item colSpan="6">
            <Grid.Root columns="12" gap="4">
              <EntitySwitch>
                <EntitySwitch.Case if={entity => entity.kind === 'Domain'}>
                  { entityCardPresets.domain.dependants() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'System'}>
                  { entityCardPresets.system.dependants() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'Component'}>
                  { entityCardPresets.component.dependants() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'Resource'}>
                  { entityCardPresets.resource.dependants() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'API'}>
                  { entityCardPresets.api.dependants() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'User'}>
                  { entityCardPresets.user.dependants() }
                </EntitySwitch.Case>
                <EntitySwitch.Case if={entity => entity.kind === 'Group'}>
                  { entityCardPresets.group.dependants() }
                </EntitySwitch.Case>
              </EntitySwitch>
            </Grid.Root>
          </Grid.Item>
        </Grid.Root>
      </Grid.Item>

      {/* graph card */}
      <Grid.Item colSpan="12" >
        <EntitySwitch>
          <EntitySwitch.Case if={entity => ['User', 'Group'].includes(entity.kind)}>
            <EntityCatalogGraphCard
              kinds={['Domain', 'System', 'Component', 'Resource', 'API', 'User', 'Group']}
              direction={Direction.LEFT_RIGHT}
              maxDepth={1}
              showArrowHeads={true}
              unidirectional={false}
              // Merges hasPart/partOf, etc.
              //mergeRelations={false}
            />
          </EntitySwitch.Case>
          <EntitySwitch.Case>
            <EntityCatalogGraphCard
              kinds={['Domain', 'System', 'Component', 'Resource', 'API']}
              direction={Direction.LEFT_RIGHT}
              maxDepth={1}
              showArrowHeads={true}
              unidirectional={false}
              // Merges hasPart/partOf, etc.
              //mergeRelations={false}
            />
          </EntitySwitch.Case>
        </EntitySwitch>
      </Grid.Item>
    </Grid.Root>
  )
}