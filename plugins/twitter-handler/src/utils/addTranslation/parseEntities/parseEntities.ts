import { TwitterApi } from "../../../models/twitterApi";
import { parseHashtags } from "./parseHashtags";
import { parseMentions } from "./parseMentions";
import { parseSymbols } from "./parseSymbols";
import { parseUrls } from "./parseUrls";

/**
 * Add new extended entities to the tweet
 * @param tweet the tweet to parse entities on
 */
export const parseEntities = (tweet: TwitterApi.Tweet.TweetResult) => {
  parseMentions(tweet);
  parseHashtags(tweet);
  parseSymbols(tweet);
  parseUrls(tweet);
};
