export const completeExistingOrCreate = async <T>(
  update: () => Promise<T>,
  create: () => Promise<T>,
): Promise<T> => {
  try {
    return await update();
  } catch (error) {
    if (typeof error === "object" && error !== null &&
        "status" in error && error.status === 404) {
      return create();
    }
    throw error;
  }
};
