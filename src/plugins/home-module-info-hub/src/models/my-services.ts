export interface MyService {
  ref: string;
  displayName: string;
  owner?: string;
  lifecycle?: string;
}

export interface CatalogServiceEntity {
  kind: string;
  metadata: {
    name?: string;
    namespace?: string;
    title?: string;
  };
  spec?: {
    owner?: unknown;
    lifecycle?: unknown;
  };
  relations?: { type: string; targetRef: string }[];
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function toMyService(
  entity: CatalogServiceEntity,
  ownershipEntityRefs: string[] = [],
): MyService | undefined {
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
    lifecycle: nonEmptyString(entity.spec?.lifecycle),
  };
}

export function sortByDisplayName(services: MyService[]): MyService[] {
  return [...services].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName, 'en', {
        sensitivity: 'base',
      }) || a.ref.localeCompare(b.ref),
  );
}

export function toMyServices(
  entities: CatalogServiceEntity[],
  ownershipEntityRefs: string[] = [],
): MyService[] {
  const byRef = new Map<string, MyService>();
  for (const entity of entities) {
    const service = toMyService(entity, ownershipEntityRefs);
    if (service && !byRef.has(service.ref)) {
      byRef.set(service.ref, service);
    }
  }
  return sortByDisplayName([...byRef.values()]);
}
