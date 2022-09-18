import { readFile } from "fs/promises";
import { ITaskContext } from "../../../models/taskContext";
import { createBase64ImageUrl } from "../../createBase64ImageUrl";

/**
 * Add background to the webpage
 * @param taskContext the shared task context
 */
export const addBackground = async (taskContext: ITaskContext) => {
  if (!taskContext.translateContext?.customized?.background) return;

  const backgroundData = await readFile(
    taskContext.translateContext.customized.background,
    { encoding: "base64" }
  ).catch(() => "");

  if (!backgroundData) return;

  await taskContext.page.evaluate((backgroundData: string) => {
    const timelineSection = document.querySelector("section");
    timelineSection.style.background = createBase64ImageUrl(backgroundData);
    timelineSection.style.backgroundRepeat = "no-repeat";
  }, backgroundData);
};
