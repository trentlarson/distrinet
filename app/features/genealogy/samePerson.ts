import { Cache, CacheWrapper } from '../distnet/distnetClasses';
import uriTools from './js/uriTools';

const R = require('./js/ramda-0.25.0.min.js');

const SAME_IDENTITIES_KEY = 'SAME_IDENTITIES';

/**
 * Use browser storage to maintain mappings between data sets
 *
 */
export default class MapperBetweenSets {
  /**
   * return list of all other IDs correlated with this one
   */
  public static retrieveFor(key: string): Array<string> {
    const idMapStr = sessionStorage[SAME_IDENTITIES_KEY];
    const idMap = idMapStr ? JSON.parse(idMapStr) : {};
    return idMap[key] || [];
  }

  /**
   * If there are items in the cache that are are newer, update the mappings in sessionStorage.
   */
  public static refreshIfNewer(
    previousMillis: number,
    cacheMap: Cache,
    updateMillis: (arg0: number) => void
  ): void {
    const allMillis = R.map(
      R.pipe(R.prop('updatedDate'), (d: string) => new Date(d).valueOf(), ),
      R.values(cacheMap)
    );
    const maxMillis = R.last(R.sort(R.subtract, allMillis));
    if (previousMillis && previousMillis >= maxMillis) {
      // we're already up-to-date
      return;
    }
    console.log('Map of IDs-spanning-data-sets is out-of-date.  Refreshing...');
    const cache = new CacheWrapper(cacheMap);
    const keys = cache.getKeys();
    for (let ki = 0; ki < keys.length; ki += 1) {
      const key = keys[ki];
      if (key.startsWith('gedcomx:')) {
        const content = JSON.parse(cache.valueFor(key).contents);

        for (
          let pi = 0;
          content.persons && pi < content.persons.length;
          pi += 1
        ) {
          const { links } = content.persons[pi];
          if (links && links.otherLocations) {
            for (
              let li = 0;
              li < links.otherLocations.resources.length;
              li += 1
            ) {
              const otherRes = links.otherLocations.resources[li];
              if (
                otherRes.format === 'gedcomx' ||
                otherRes.resource.startsWith('gedcomx:')
              ) {
                const thisId = uriTools.globalUriForId(
                  content.persons[pi].id,
                  key
                );
                const otherId = uriTools.globalUriForResource(
                  otherRes.resource,
                  key
                );
                this.addPair(thisId, otherId);
              }
            }
          } else if (links && links.person) {
            const thisId = uriTools.globalUriForId(content.persons[pi].id, key);
            const otherId = uriTools.globalUriForResource(
              uriTools.removeQueryForFS(content.persons[pi].links.person.href),
              key
            );
            this.addPair(thisId, otherId);
          }
        }
      }
    }
    updateMillis(maxMillis);
    console.log('... refreshed.  Map of IDs-spanning-data-sets is up-to-date.');
  }

  /**
   * Add these two ids one another's mappings in sessionStorage.
   */
  static addPair(id1: string, id2: string): void {
    const idMapStr = sessionStorage[SAME_IDENTITIES_KEY];
    const idMap = idMapStr ? JSON.parse(idMapStr) : {};
    const allSameIds = this.combineAllIdentities([id1, id2], idMap);
    for (let i = 0; i < allSameIds.length; i += 1) {
      const otherIds = R.without([allSameIds[i]], allSameIds);
      idMap[allSameIds[i]] = otherIds;
    }
    sessionStorage[SAME_IDENTITIES_KEY] = JSON.stringify(idMap);
  }

  /**
   * Add initialIds to the allIdMappings
   */
  static combineAllIdentities(
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
}
