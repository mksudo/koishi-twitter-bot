import { ElementHandle } from "puppeteer-core";
import { randomInRange } from "./randomInRange";
import { waitFor } from "./waitFor";

/**
 * Type the provided content to the element handle with delay
 * @param element element handle on the webpage
 * @param content the text to be typed to the element handle
 */
export const typeToElement = async (
  element: ElementHandle,
  content: string
) => {
  await element.type(content, {
    delay: randomInRange(100, 300),
  });
  await waitFor(randomInRange(300, 500));
};
