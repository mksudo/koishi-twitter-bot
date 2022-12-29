import { readFile } from "fs/promises";
import { Logger } from "koishi";
import { ITaskContext } from "../../../models/taskContext";
import { createBase64ImageUrl } from "../../createBase64ImageUrl";

/**
 * Add tag to the webpage
 * @param taskContext the shared task context
 */
export const addTag = async (taskContext: ITaskContext, logger: Logger) => {
  if (!taskContext.translateContext?.customized?.tag) {
    logger.debug("no existing tag data, skipping");
    return;
  }

  const tagData = await readFile(taskContext.translateContext.customized.tag, {
    encoding: "base64",
  }).catch(() => "");

  if (!tagData) {
    logger.debug("error when reading tag data, skipping");
    return;
  }

  logger.debug("adding tag data to web page");

  await taskContext.page.evaluate(
    (tagData: string, majorTweetIndex: number, majorTranslation: string) => {
      const articles = document.querySelectorAll("article");
      const majorArticle = articles[majorTweetIndex];

      if (majorArticle === undefined) return;
      const contentDiv = majorArticle.querySelector(
        'div[data-testid="tweetText"]'
      );
      for (const child of contentDiv.children) {
        if (
          child.tagName === "SPAN" &&
          majorTranslation.indexOf(child.textContent) > -1
        ) {
          const tagElement = document.createElement("img");
          tagElement.className = "tag";
          tagElement.setAttribute("src", createBase64ImageUrl(tagData));
          contentDiv.insertBefore(tagElement, child);
        }
      }
    },
    tagData,
    taskContext.translateContext.majorTweetIndex,
    taskContext.translateContext.translations[
      taskContext.translateContext.majorTweetIndex
    ].translation
  );
};
