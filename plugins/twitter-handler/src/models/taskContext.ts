import { Context } from "koishi";
import { Page } from "puppeteer-core";
import { IScreenshotContext } from "./screenshotContext";
import { ITranslateContext } from "./translateContext";

export interface ITaskContext {
  ctx: Context;
  page: Page;
  screenshotContext: IScreenshotContext;
  translateContext?: ITranslateContext;
}
