export interface ICardTitleTranslation {
  type: "title";
  translation: string;
}

export interface ICardDescriptionTranslation {
  type: "description";
  translation: string;
}

export interface ICardTranslation {
  type: "card";
  title?: ICardTitleTranslation;
  description?: ICardDescriptionTranslation;
}
