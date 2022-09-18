import { TwitterApi } from "./twitterApi";
import { ITwitterCredentials } from "./twitterCredentials";

/**
 * Represents all necessary data shared for screenshot process
 */
export interface IScreenshotContext {
  // the url of the tweet
  url: string;
  // the credentials to be used when loggin in
  credentials: ITwitterCredentials;
  // how many tweets are we interested in
  count?: number;
  // the base64 screenshot content
  screenshot?: string;
  // all tweet data on the webpage
  tweets?: (TwitterApi.Tweet.TweetResult | TwitterApi.Tweet.TweetTombstone)[];
}
