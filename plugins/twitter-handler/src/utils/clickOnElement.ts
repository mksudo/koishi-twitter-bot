import { ElementHandle } from "puppeteer-core";
import { randomInRange } from "./randomInRange";
import { waitFor } from "./waitFor";

export const clickOnElement = async (element: ElementHandle) => {
  await element.click();
  await waitFor(randomInRange(300, 500));
};
