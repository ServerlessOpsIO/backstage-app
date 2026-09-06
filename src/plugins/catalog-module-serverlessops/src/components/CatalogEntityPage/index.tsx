import {
  EntitySwitch,
  isKind,
} from '@backstage/plugin-catalog';

import { ApiPage } from './ApiCatalogEntityPage'
import { ComponentPage } from './ComponentCatalogEntityPage'
import { DefaultEntityPage } from './CommonCatalogEntityPage'
import { DomainPage } from './DomainCatalogEntityPage'
import { GroupPage } from './GroupCatalogEntityPage'
import { SystemPage } from './SystemCatalogEntityPage'
import { UserPage } from './UserCatalogEntityPage'

export const EntityPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isKind('component')} children={ComponentPage} />
    <EntitySwitch.Case if={isKind('api')} children={ApiPage} />
    <EntitySwitch.Case if={isKind('group')} children={GroupPage} />
    <EntitySwitch.Case if={isKind('user')} children={UserPage} />
    <EntitySwitch.Case if={isKind('system')} children={SystemPage} />
    <EntitySwitch.Case if={isKind('domain')} children={DomainPage} />

    <EntitySwitch.Case>{DefaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);
