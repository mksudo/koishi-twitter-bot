/**
 * Wait for the given amount of time
 * @param ms time in ms
 */
export const waitFor = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
