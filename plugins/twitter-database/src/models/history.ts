/**
 * Represents a twitter hisrory in the database
 */
export interface ITwitterHistory {
  readonly registeredBy: string;
  // index of the history, will be unique
  readonly index: number;
  // the url to be stored, will ignore the https://twitter.com/ part
  readonly url: string;
}
