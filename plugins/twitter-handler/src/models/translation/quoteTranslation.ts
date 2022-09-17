import { ICardTranslation } from "./cardTranslation";
import { IPollTranslation } from "./pollTranslation";

export interface IQuoteTranslation {
  type: "quote";
  translation: string;
  entities?: (ICardTranslation | IPollTranslation)[];
}
