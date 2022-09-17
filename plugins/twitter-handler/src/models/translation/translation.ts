import { ICardTranslation } from "./cardTranslation";
import { IPollTranslation } from "./pollTranslation";
import { IQuoteTranslation } from "./quoteTranslation";

export type EntityTranslation =
  | ICardTranslation
  | IPollTranslation
  | IQuoteTranslation;

export const entityTags = ["choice", "title", "description"] as const;

export interface ITranslation {
  index: number;
  translation: string;
  entities?: EntityTranslation[];
}
