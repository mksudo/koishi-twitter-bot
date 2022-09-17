import { ITwitterIdentifier } from "./identifier";

export interface ITwitterUser extends ITwitterIdentifier {
  tweet: boolean;
  retweet: boolean;
  comment: boolean;

  screenshot: boolean;
  text: boolean;
  translation: boolean;
  extended: boolean;
}
