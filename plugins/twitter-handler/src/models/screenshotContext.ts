import { TwitterApi } from "./twitterApi";
import { ITwitterCredentials } from "./twitterCredentials";

export interface IScreenshotContext {
  url: string;
  credentials: ITwitterCredentials;
  count?: number;
  screenshot?: string;
  tweets?: (TwitterApi.Tweet.TweetResult | TwitterApi.Tweet.TweetTombstone)[];
}
