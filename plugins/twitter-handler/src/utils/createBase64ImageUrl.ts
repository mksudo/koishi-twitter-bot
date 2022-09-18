/**
 * Create a base64 url for the provided base64 image for webpage usage
 *
 * @param base64Image the base64 image content
 *
 * @returns the base64 image url for the image to be used on webpage
 */
export const createBase64ImageUrl = (base64Image: string) => {
  return `url("data:image/png;base64,${base64Image}")`;
};
