import { ITwitterIdentifier } from "./identifier";

/**
 * Represents the twitter user in the database
 */
export interface ITwitterUser extends ITwitterIdentifier {
  // whether the user wants tweets
  tweet: boolean;
  // whether the user wants retweets
  retweet: boolean;
  // whether the user wants comments
  comment: boolean;

  // whether the user wants screenshot
  screenshot: boolean;
  // whether the user wants text
  text: boolean;
  // whether the user wants translation
  translation: boolean;
  // whether the user wants extended entities
  extended: boolean;
}
