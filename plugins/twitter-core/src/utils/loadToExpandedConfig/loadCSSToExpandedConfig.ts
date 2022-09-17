import { readFile } from "fs/promises";
import { ExpandedConfig } from "../../models/expandedConfig";

export const loadCSSToExpandedConfig = async (
  config: ExpandedConfig,
  cssPath: string | undefined
) => {
  if (cssPath === undefined) {
    config.css = "";
  } else {
    const cssContent = await readFile(cssPath, { encoding: "utf-8" }).catch(
      () => ""
    );

    config.css = cssContent;
  }
};
