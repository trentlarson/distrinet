import R from 'ramda';

/**
interface SameIdentitiesMap {
  sameIdentities: Record<string, string>;
  date: string; // date this data was refreshed
}
 */

const SAME_IDENTITIES_KEY = 'SAME_IDENTITIES';

/**
 * Use LocalStorage to maintain mappings between data sets
 *
 */
export default class MapperBetweenSets {
  public static refresh(cache: Cache): void {
    throw new Error(`Not finished ${cache}`);
  }

  private static findAllIdentities(
    initialIds: Array<string>,
    allIdMappings: Record<string, Array<string>>
  ): Array<string> {
    let collectedIds = R.clone(initialIds);
    let remainingIds = R.clone(initialIds);
    while (remainingIds.length > 0) {
      const additions = allIdMappings[remainingIds[0]] || [];
      const newIds = R.difference(additions, collectedIds);
      collectedIds = R.union(collectedIds, newIds);
      remainingIds = R.drop(1, remainingIds);
      remainingIds = R.union(remainingIds, newIds);
    }
    return collectedIds;
  }

  public static addPair(id1: string, id2: string): void {
    const idMap = JSON.parse(localStorage[SAME_IDENTITIES_KEY]) || {};
    const allSameIds = this.findAllIdentities([id1, id2], idMap);
    for (let i = 0; i < allSameIds.length; i += 1) {
      const otherIds = R.without([allSameIds[i]], allSameIds);
      idMap[allSameIds[i]] = otherIds;
    }
    localStorage[SAME_IDENTITIES_KEY] = JSON.stringify(idMap);
  }
}
