export const createBase64ImageUrl = (base64Image: string) => {
  return `url("data:image/png;base64,${base64Image}")`;
};
