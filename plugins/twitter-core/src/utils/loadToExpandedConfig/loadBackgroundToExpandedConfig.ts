import { readFile } from "fs/promises";
import { segment } from "koishi";
import { ITwitterCustomized } from "koishi-plugin-twitter-database";
import { ExpandedConfig } from "../../models/expandedConfig";

export const loadBackgroundToExpandedConfig = async (
  config: ExpandedConfig,
  backgroundPath: string | undefined
) => {
  if (backgroundPath === undefined) {
    config.background = "";
  } else {
    const backgroundContent = await readFile(backgroundPath, {
      encoding: "base64",
    }).catch(() => "");

    config.background = segment("image", {
      url: `base64://${backgroundContent}`,
    }).toString();
  }
};
