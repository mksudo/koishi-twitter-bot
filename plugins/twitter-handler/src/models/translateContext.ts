import { ITranslation } from "./translation/translation";
import { ITwitterCustomized } from "koishi-plugin-twitter-database";

export interface ITranslateContext {
  translations: ITranslation[];
  majorTweetIndex?: number;
  customized?: ITwitterCustomized;
}
