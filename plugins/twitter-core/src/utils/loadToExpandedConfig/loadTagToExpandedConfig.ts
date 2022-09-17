import { readFile } from "fs/promises";
import { segment } from "koishi";
import { ExpandedConfig } from "../../models/expandedConfig";

export const loadTagToExpandedConfig = async (
  config: ExpandedConfig,
  tagPath: string | undefined
) => {
  if (tagPath === undefined) {
    config.tag = "";
  } else {
    const tagContent = await readFile(tagPath, {
      encoding: "base64",
    }).catch(() => "");

    config.tag = segment("image", {
      url: `base64://${tagContent}`,
    }).toString();
  }
};
