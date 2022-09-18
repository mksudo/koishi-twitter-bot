import { ICardTranslation } from "./cardTranslation";
import { IPollTranslation } from "./pollTranslation";

/**
 * Represents a translation block for the quoted tweet
 */
export interface IQuoteTranslation {
  type: "quote";
  translation: string;
  entities?: (ICardTranslation | IPollTranslation)[];
}
