import { readFile } from "fs/promises";
import { segment } from "koishi";

export const loadTag = async (tagPath: string | undefined) => {
  if (tagPath === undefined) {
    return "";
  }
  const tagContent = await readFile(tagPath, {
    encoding: "base64",
  }).catch(() => "");

  return tagContent
    ? segment("image", {
        url: `base64://${tagContent}`,
      }).toString()
    : "";
};
