import { readFile } from "fs/promises";
import { ITaskContext } from "../../../models/taskContext";

/**
 * Add CSS to the webpage
 * @param taskContext the shared task context
 */
export const addCSS = async (taskContext: ITaskContext) => {
  if (!taskContext.translateContext?.customized?.css) return;

  const cssData = await readFile(taskContext.translateContext.customized.css, {
    encoding: "utf-8",
  }).catch(() => "");

  await taskContext.page.evaluate((cssData: string) => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = cssData;
    document.body.appendChild(styleElement);
  }, cssData);
};
