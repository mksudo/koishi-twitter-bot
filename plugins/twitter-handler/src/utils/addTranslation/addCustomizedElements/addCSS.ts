import { readFile } from "fs/promises";
import { Logger } from "koishi";
import { ITaskContext } from "../../../models/taskContext";

/**
 * Add CSS to the webpage
 * @param taskContext the shared task context
 */
export const addCSS = async (taskContext: ITaskContext, logger: Logger) => {
  if (!taskContext.translateContext?.customized?.css) {
    logger.debug("no existing css data, skipping");
    return;
  }

  const cssData = await readFile(taskContext.translateContext.customized.css, {
    encoding: "utf-8",
  }).catch(() => "");

  if (!cssData) {
    logger.debug("error when reading css data, skipping");
    return;
  }

  await taskContext.page.evaluate((cssData: string) => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = cssData;
    document.body.appendChild(styleElement);
  }, cssData);
};
