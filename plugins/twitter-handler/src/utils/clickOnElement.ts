import { ElementHandle } from "puppeteer-core";
import { randomInRange } from "./randomInRange";
import { waitFor } from "./waitFor";

/**
 * Click on the provided element handle with delay
 * @param element element handle on webpage
 */
export const clickOnElement = async (element: ElementHandle) => {
  await element.click();
  await waitFor(randomInRange(300, 500));
};
