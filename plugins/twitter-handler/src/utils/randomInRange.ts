/**
 * Get a random integer within the interval
 * @param min minimum integer
 * @param max maximum integer
 * @returns a random integer in [min, max]
 */
export const randomInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};
