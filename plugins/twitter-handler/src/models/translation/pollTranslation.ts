export interface IPollChoiceTranslation {
  type: "choice";
  index: number;
  translation: string;
}

export interface IPollTranslation {
  type: "poll";
  choices: IPollChoiceTranslation[];
}
