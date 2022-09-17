import { ElementHandle } from "puppeteer-core";
import { randomInRange } from "./randomInRange";
import { waitFor } from "./waitFor";

export const typeToElement = async (
  element: ElementHandle,
  content: string
) => {
  await element.type(content, {
    delay: randomInRange(100, 300),
  });
  await waitFor(randomInRange(300, 500));
};
