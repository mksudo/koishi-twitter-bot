import { ICardTranslation } from "./cardTranslation";
import { IPollTranslation } from "./pollTranslation";
import { IQuoteTranslation } from "./quoteTranslation";

// utility type for all entity translation
export type EntityTranslation =
  | ICardTranslation
  | IPollTranslation
  | IQuoteTranslation;

// all possible entity tags
export const entityTags = ["choice", "title", "description"] as const;

/**
 * Represents a translation block for a tweet
 */
export interface ITranslation {
  index: number;
  translation: string;
  entities?: EntityTranslation[];
}
