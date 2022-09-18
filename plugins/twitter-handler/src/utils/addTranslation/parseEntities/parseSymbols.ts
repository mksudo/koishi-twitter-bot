import twitterText from "twitter-text";
import { TwitterApi } from "../../../models/twitterApi";

/**
 * Parse the new full text for new symbols
 * @param tweet the tweet to be parsed
 */
export const parseSymbols = (tweet: TwitterApi.Tweet.TweetResult) => {
  const nextSymbols = twitterText
    .extractCashtagsWithIndices(tweet.legacy.full_text)
    .map<TwitterApi.Entity.SimpleEntity.Symbol>((symbol) => {
      return {
        text: symbol.cashtag,
        indices: symbol.indices,
      };
    });

  tweet.legacy.entities.symbols = nextSymbols;
};
