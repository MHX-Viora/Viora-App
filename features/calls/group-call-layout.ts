/**
 * Keep the FlatList shape stable while LiveKit native video views are mounted.
 * Changing numColumns requires remounting the list, which can reparent a
 * VideoTrack surface before Fabric has detached it from the previous parent.
 */
export function getGroupCallColumnCount(_participantCount: number): 2 {
  return 2;
}
