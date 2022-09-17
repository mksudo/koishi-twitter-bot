import { TwitterApi } from "../../../models/twitterApi";
import { parseHashtags } from "./parseHashtags";
import { parseMentions } from "./parseMentions";
import { parseSymbols } from "./parseSymbols";
import { parseUrls } from "./parseUrls";

export const parseEntities = (tweet: TwitterApi.Tweet.TweetResult) => {
  parseMentions(tweet);
  parseHashtags(tweet);
  parseSymbols(tweet);
  parseUrls(tweet);
};
