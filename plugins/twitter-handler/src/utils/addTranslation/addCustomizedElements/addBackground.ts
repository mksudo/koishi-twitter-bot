import { readFile } from "fs/promises";
import { Logger } from "koishi";
import { ITaskContext } from "../../../models/taskContext";
import { createBase64ImageUrl } from "../../createBase64ImageUrl";

/**
 * Load background data to the shared task context,
 * set value to undefined if error occured
 * @param taskContext the shared task context
 * @param logger the logger
 */
export const loadBackground = async (
  taskContext: ITaskContext,
  logger: Logger
) => {
  logger.debug("loading background data");
  if (taskContext.translateContext?.customized?.background === undefined) {
    logger.debug("no existing background data, skipping");
    return;
  }

  await readFile(taskContext.translateContext.customized.background, {
    encoding: "base64",
  }).then(
    (backgroundData) => {
      taskContext.translateContext.customized.background =
        createBase64ImageUrl(backgroundData);
    },
    () => {
      logger.debug("error when reading background data, skipping");
      taskContext.translateContext.customized.background = undefined;
    }
  );

  logger.debug("background data loaded");
};

/**
 * Add background to the webpage
 * @param taskContext the shared task context
 * @param logger the logger
 */
export const addBackground = async (
  taskContext: ITaskContext,
  logger: Logger
) => {
  logger.debug("adding background data");

  await taskContext.page.evaluate((backgroundData: string) => {
    const timelineSection = document.querySelector("section");
    timelineSection.style.background = backgroundData;
    timelineSection.style.backgroundRepeat = "no-repeat";
  }, taskContext.translateContext.customized.background);

  logger.debug("background data added");
};
