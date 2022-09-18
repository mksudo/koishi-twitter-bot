/**
 * Represents a translation block for tweet card title
 */
export interface ICardTitleTranslation {
  type: "title";
  translation: string;
}

/**
 * Represents a translation block for tweet card description
 */
export interface ICardDescriptionTranslation {
  type: "description";
  translation: string;
}

/**
 * Represents a translation block for tweet cards
 */
export interface ICardTranslation {
  type: "card";
  title?: ICardTitleTranslation;
  description?: ICardDescriptionTranslation;
}
