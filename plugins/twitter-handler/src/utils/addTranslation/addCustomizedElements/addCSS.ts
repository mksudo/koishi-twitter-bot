import { readFile } from "fs/promises";
import { Logger } from "koishi";
import { ITaskContext } from "../../../models/taskContext";

/**
 * Load css data to the shared task context,
 * set value to undefined if error occured
 * @param taskContext the shared task context
 * @param logger the logger
 */
export const loadCSS = async (taskContext: ITaskContext, logger: Logger) => {
  logger.debug("loading css data");

  if (taskContext.translateContext?.customized?.css === undefined) {
    logger.debug("no existing css data, skipping");
    return;
  }

  await readFile(taskContext.translateContext.customized.css, {
    encoding: "utf-8",
  }).then(
    (cssData) => {
      taskContext.translateContext.customized.css = cssData;
    },
    () => {
      logger.debug("error when reading css data, skipping");
      taskContext.translateContext.customized.css = undefined;
    }
  );

  logger.debug("css data loaded");
};

/**
 * Add CSS to the webpage
 * @param taskContext the shared task context
 * @param logger the logger
 */
export const addCSS = async (taskContext: ITaskContext, logger: Logger) => {
  logger.debug("adding css data");

  await taskContext.page.evaluate((cssData: string) => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = cssData;
    document.body.appendChild(styleElement);
  }, taskContext.translateContext.customized.css);

  logger.debug("css data added");
};
