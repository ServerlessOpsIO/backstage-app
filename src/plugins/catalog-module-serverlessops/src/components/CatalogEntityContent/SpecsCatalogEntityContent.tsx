import { Grid } from '@material-ui/core'
import { Entity, stringifyEntityRef } from '@backstage/catalog-model'
import { Progress, ResponseErrorPanel } from '@backstage/core-components'
import { useApi } from '@backstage/core-plugin-api'
import {
  catalogApiRef,
  EntityTable,
  useEntity,
} from '@backstage/plugin-catalog-react'
import useAsync from 'react-use/esm/useAsync'

// Specs are Resources of this type that depend on their component; the
// speckit-spec template creates them.
const SPEC_TYPE = 'doc-spec'

const specTitle = (spec: Entity) => spec.metadata.title ?? spec.metadata.name

// Spec titles start with their spec number, so this also sorts them in
// creation order. Numeric collation orders unpadded numbers too.
const compareSpecTitles = (a: Entity, b: Entity) =>
  specTitle(a).localeCompare(specTitle(b), undefined, { numeric: true })

const columns = [
  EntityTable.columns.createEntityRefColumn<Entity>({ defaultKind: 'Resource' }),
  EntityTable.columns.createMetadataDescriptionColumn<Entity>(),
  EntityTable.columns.createOwnerColumn<Entity>(),
]

export const SpecsCatalogEntityContent = () => {
  const { entity } = useEntity()
  const catalogApi = useApi(catalogApiRef)
  const entityRef = stringifyEntityRef(entity)

  const { value: specs, loading, error } = useAsync(async () => {
    const { items } = await catalogApi.getEntities({
      filter: {
        kind: 'Resource',
        'spec.type': SPEC_TYPE,
        'relations.dependsOn': entityRef,
      },
    })
    return items.sort(compareSpecTitles)
  }, [catalogApi, entityRef])

  if (loading) {
    return <Progress />
  }
  if (error) {
    return <ResponseErrorPanel error={error} />
  }

  return (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item xs={12}>
        <EntityTable
          title="Specs"
          entities={specs ?? []}
          columns={columns}
          emptyContent={
            <div style={{ padding: 16 }}>
              No specs for this component yet. Specs appear here once their
              spec pull request is merged.
            </div>
          }
        />
      </Grid>
    </Grid>
  )
}
