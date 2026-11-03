export interface MySystem {
  ref: string;
  displayName: string;
  owner?: string;
}

export interface CatalogSystemEntity {
  kind: string;
  metadata: {
    name?: string;
    namespace?: string;
    title?: string;
  };
  spec?: {
    owner?: unknown;
  };
  relations?: { type: string; targetRef: string }[];
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function toMySystem(
  entity: CatalogSystemEntity,
  ownershipEntityRefs: string[] = [],
): MySystem | undefined {
  const name = nonEmptyString(entity.metadata?.name);
  if (!name || !nonEmptyString(entity.kind)) {
    return undefined;
  }

  const namespace = nonEmptyString(entity.metadata.namespace) ?? 'default';
  const ownerRefs = (entity.relations ?? [])
    .filter(relation => relation.type === 'ownedBy')
    .map(relation => relation.targetRef);
  const owner =
    ownerRefs.find(ref => ownershipEntityRefs.includes(ref)) ??
    ownerRefs[0] ??
    nonEmptyString(entity.spec?.owner);

  return {
    ref: `${entity.kind}:${namespace}/${name}`.toLocaleLowerCase('en-US'),
    displayName: nonEmptyString(entity.metadata.title) ?? name,
    owner,
  };
}

export function sortByDisplayName(systems: MySystem[]): MySystem[] {
  return [...systems].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName, 'en', {
        sensitivity: 'base',
      }) || a.ref.localeCompare(b.ref),
  );
}

export function toMySystems(
  entities: CatalogSystemEntity[],
  ownershipEntityRefs: string[] = [],
): MySystem[] {
  const byRef = new Map<string, MySystem>();
  for (const entity of entities) {
    const system = toMySystem(entity, ownershipEntityRefs);
    if (system && !byRef.has(system.ref)) {
      byRef.set(system.ref, system);
    }
  }
  return sortByDisplayName([...byRef.values()]);
}
