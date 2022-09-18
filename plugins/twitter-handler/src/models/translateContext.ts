import { ITranslation } from "./translation/translation";
import { ITwitterCustomized } from "koishi-plugin-twitter-database";

/**
 * Represents all necessary data shared for translation process
 */
export interface ITranslateContext {
  // parsed translation blocks
  translations: ITranslation[];
  // the index of the main tweet on the webpage
  majorTweetIndex?: number;
  // the customized contents to be added to the webpage
  customized?: ITwitterCustomized;
}
