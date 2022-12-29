import { readFile } from "fs/promises";

export const loadCSS = async (cssPath: string | undefined) => {
  if (cssPath === undefined) {
    return "";
  }
  return await readFile(cssPath, { encoding: "utf-8" }).catch(() => "");
};
