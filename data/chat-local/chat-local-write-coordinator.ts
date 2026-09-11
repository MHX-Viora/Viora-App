let mutationGeneration = 0;
let mutationTail: Promise<unknown> = Promise.resolve();

export const enqueueLocalMutation = <T>(mutation: () => Promise<T>) => {
  const scheduledGeneration = mutationGeneration;
  const result = mutationTail
    .catch(() => undefined)
    .then(() => scheduledGeneration === mutationGeneration ? mutation() : undefined);
  mutationTail = result;
  return result;
};

export const clearAfterLocalMutations = (clear: () => Promise<void>) => {
  mutationGeneration += 1;
  const result = mutationTail.catch(() => undefined).then(clear);
  mutationTail = result;
  return result;
};
