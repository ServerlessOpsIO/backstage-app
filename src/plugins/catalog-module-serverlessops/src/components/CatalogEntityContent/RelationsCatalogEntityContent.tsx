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
  useEntityPresentation,
} from '@backstage/plugin-catalog-react'
import {
  entityDataTableColumns,
  EntityColumnConfig,
  EntityRelationCard
} from '@backstage/plugin-catalog-react/alpha'
import {
  EntityCatalogGraphCard,
  Direction,
  EntityNode,
} from '@backstage/plugin-catalog-graph'
import { DEFAULT_NAMESPACE } from '@backstage/catalog-model'
import { useTheme, makeStyles } from '@material-ui/core/styles'
import classNames from 'classnames'
import { useLayoutEffect, useRef, useState } from 'react'

const useKindColoredNodeStyles = makeStyles(
  theme => ({
    node: {
      fill: theme.palette.grey[300],
      stroke: theme.palette.grey[300],
    },
    text: {
      fill: theme.palette.getContrastText(theme.palette.grey[300]),
      '&.focused': {
        fontWeight: 'bold',
      },
    },
    clickable: {
      cursor: 'pointer',
    },
  }),
  { name: 'PluginServerlessOpsKindColoredGraphNode' },
)

const kindNodeColors: Record<string, string> = {
  domain: '#8e44ad',
  system: '#0078d4',
  component: '#f4c542',
  resource: '#f59e0b',
  api: '#10b981',
  group: '#22d3ee',
  user: '#d946ef',
}

const getKindFill = (kind?: string, fallback = '#1976d2') => {
  const normalizedKind = kind?.toLowerCase() ?? ''
  return kindNodeColors[normalizedKind] ?? kindNodeColors[kind ?? ''] ?? fallback
}

const KindColoredGraphNode = ({ node, onClick }: { node: EntityNode; onClick?: (event: any) => void }) => {
  const classes = useKindColoredNodeStyles()
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const idRef = useRef<SVGTextElement | null>(null)
  const entityPresentation = useEntityPresentation(node.entity, {
    defaultNamespace: DEFAULT_NAMESPACE,
  })

  useLayoutEffect(() => {
    if (idRef.current) {
      let { height: renderedHeight, width: renderedWidth } = idRef.current.getBBox()
      renderedHeight = Math.round(renderedHeight)
      renderedWidth = Math.round(renderedWidth)

      if (renderedHeight !== height || renderedWidth !== width) {
        setWidth(renderedWidth)
        setHeight(renderedHeight)
      }
    }
  }, [width, height, node.entity])

  const kindValue = String((node as any).kind ?? node.entity?.kind ?? '')
  const fill = getKindFill(kindValue, theme.palette.primary.main)
  const textFill = theme.palette.getContrastText(fill)
  const hasKindIcon = !!entityPresentation.Icon
  const padding = 10
  const iconSize = height
  const paddedIconWidth = hasKindIcon ? iconSize + padding : 0
  const paddedWidth = paddedIconWidth + width + padding * 2
  const paddedHeight = height + padding * 2
  const displayTitle = entityPresentation.primaryTitle ?? node.entity.metadata.name
  const Icon = entityPresentation.Icon as React.ComponentType<any>

  return (
    <g onClick={onClick ?? node.onClick} className={classNames(onClick || node.onClick ? classes.clickable : undefined)}>
      <rect
        width={paddedWidth}
        height={paddedHeight}
        rx={10}
        style={{ fill, stroke: fill }}
      />
      {hasKindIcon && Icon && (
        <Icon
          y={padding}
          x={padding}
          width={iconSize}
          height={iconSize}
          className={classNames(
            classes.text,
            node.focused && 'focused',
          )}
          style={{ color: textFill, fill: textFill }}
        />
      )}
      <text
        ref={idRef}
        className={classNames(
          classes.text,
          node.focused && 'focused',
        )}
        y={paddedHeight / 2}
        x={paddedIconWidth + (width + padding * 2) / 2}
        textAnchor="middle"
        alignmentBaseline="middle"
        style={{ fill: textFill }}
      >
        {displayTitle}
      </text>
      <title>{entityPresentation.entityRef}</title>
    </g>
  )
}

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
              showArrowHeads
              unidirectional={false}
              renderNode={({ node }) => <KindColoredGraphNode node={node} />}
              // Merges hasPart/partOf, etc.
              // mergeRelations={false}
            />
          </EntitySwitch.Case>
          <EntitySwitch.Case>
            <EntityCatalogGraphCard
              kinds={['Domain', 'System', 'Component', 'Resource', 'API']}
              direction={Direction.LEFT_RIGHT}
              maxDepth={1}
              showArrowHeads
              unidirectional={false}
              // Merges hasPart/partOf, etc.
              // mergeRelations={false}
              renderNode={({ node }) => <KindColoredGraphNode node={node} />}
            />
          </EntitySwitch.Case>
        </EntitySwitch>
      </Grid.Item>
    </Grid.Root>
  )
}