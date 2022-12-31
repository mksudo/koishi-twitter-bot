import { readFile } from "fs/promises";
import { Logger } from "koishi";
import { ITaskContext } from "../../../models/taskContext";
import { createBase64ImageUrl } from "../../createBase64ImageUrl";

/**
 * Load tag data to the shared task context,
 * set value to undefined if error occured
 * @param taskContext the shared task context
 * @param logger the logger
 */
export const loadTag = async (taskContext: ITaskContext, logger: Logger) => {
  logger.debug("loading tag data");

  if (taskContext.translateContext?.customized?.tag === undefined) {
    logger.debug("no existing tag data, skipping");
    return;
  }

  await readFile(taskContext.translateContext.customized.tag, {
    encoding: "base64",
  }).then(
    (tagData) => {
      taskContext.translateContext.customized.tag = tagData;
    },
    () => {
      logger.debug("error when reading tag data, skipping");
      taskContext.translateContext.customized.tag = undefined;
    }
  );

  logger.debug("tag data loaded");
};

/**
 * Add tag to the webpage
 * @param taskContext the shared task context
 * @param logger the logger
 */
export const addTag = async (taskContext: ITaskContext, logger: Logger) => {
  logger.debug("adding tag data");

  await taskContext.page.evaluate((majorTweetIndex: number) => {
    const articles = document.querySelectorAll("article");
    const majorArticle = articles[majorTweetIndex];

    if (majorArticle === undefined) return;
    const contentDiv = majorArticle.querySelector(
      'div[data-testid="tweetText"]'
    );
    for (const child of contentDiv.children) {
      if (child instanceof HTMLElement && child.tagName === "SPAN") {
        // for normal span with plain text, this has no effect
        // but the tag img element can be rendered properly after this
        child.innerHTML = child.innerText;
      }
    }
  }, taskContext.translateContext.majorTweetIndex);

  logger.debug("tag data added");
};
