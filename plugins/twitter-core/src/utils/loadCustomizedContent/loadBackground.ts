import { readFile } from "fs/promises";
import { segment } from "koishi";
import { ExpandedConfig } from "../../models/expandedConfig";

export const loadBackground = async (backgroundPath: string | undefined) => {
  if (backgroundPath === undefined) {
    return "";
  }
  const backgroundContent = await readFile(backgroundPath, {
    encoding: "base64",
  }).catch(() => "");

  return backgroundContent
    ? segment("image", {
        url: `base64://${backgroundContent}`,
      }).toString()
    : "";
};
