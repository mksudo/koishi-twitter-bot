/**
 * Represents a translation block for a tweet poll choice
 */
export interface IPollChoiceTranslation {
  type: "choice";
  index: number;
  translation: string;
}

/**
 * Represents a translation block for a tweet poll
 */
export interface IPollTranslation {
  type: "poll";
  choices: IPollChoiceTranslation[];
}
