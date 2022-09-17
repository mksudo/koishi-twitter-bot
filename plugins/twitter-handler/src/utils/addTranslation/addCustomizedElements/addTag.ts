import { readFile } from "fs/promises";
import { ITaskContext } from "../../../models/taskContext";
import { createBase64ImageUrl } from "../../createBase64ImageUrl";

export const addTag = async (taskContext: ITaskContext) => {
  if (!taskContext.translateContext?.customized?.tag) return;

  const tagData = await readFile(
    taskContext.translateContext.customized.background,
    { encoding: "base64" }
  ).catch(() => "");

  if (!tagData) return;

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
