import { Grid } from '@backstage/ui'
import {
  EntitySwitch,
} from '@backstage/plugin-catalog'
import {
  useEntityPresentation,
} from '@backstage/plugin-catalog-react'
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

export const RelationsCatalogEntityContent = () => {
  return(
    <Grid.Root columns="12" >
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