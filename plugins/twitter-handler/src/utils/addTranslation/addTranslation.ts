import { IQuoteTranslation } from "../../models/translation/quoteTranslation";
import { ITranslation } from "../../models/translation/translation";
import { TwitterApi } from "../../models/twitterApi";
import { addCardTranslation } from "./addExtendedTranslation/addCardTranslation";
import { addPollTranslation } from "./addExtendedTranslation/addPollTranslation";
import { parseEntities } from "./parseEntities/parseEntities";

/**
 * Add extended entity translation blocks to the given tweet
 * @param tweet the tweet to add extended translation to
 * @param translation the translation block to be added
 */
const addExtendedTranslation = (
  tweet: TwitterApi.Tweet.TweetResult,
  translation: ITranslation | IQuoteTranslation
) => {
  if (!translation.entities) return;

  for (const entityTranslation of translation.entities) {
    switch (entityTranslation.type) {
      case "card":
        addCardTranslation(tweet, entityTranslation);
        break;
      case "poll":
        addPollTranslation(tweet, entityTranslation);
        break;
      case "quote":
        if (tweet.quoted_status_result)
          addTranslation(tweet.quoted_status_result.result, entityTranslation);
        break;
    }
  }
};

/**
 * Add translation to the given tweet
 * @param tweet the tweet to add translation to
 * @param translation the translation blocks to be added
 * @param isMajorTweet whether the current tweet is the major tweet on the webpage
 */
export const addTranslation = (
  tweet: TwitterApi.Tweet.TweetResult,
  translation: ITranslation | IQuoteTranslation,
  isMajorTweet?: boolean
) => {
  tweet.legacy.entities?.media?.forEach((media) => {
    tweet.legacy.full_text = tweet.legacy.full_text.replace(media.url, "");
  });
  const prevTextLength = tweet.legacy.full_text.length;
  tweet.legacy.full_text += "\n\n" + translation.translation;
  const textLengthOffset = tweet.legacy.full_text.length - prevTextLength;

  tweet.legacy.lang = "zh";
  tweet.legacy.display_text_range[1] = Number.MAX_SAFE_INTEGER;
  tweet.legacy.entities?.media?.forEach((media) => {
    media.indices[0] += textLengthOffset;
    media.indices[1] += textLengthOffset;
  });
  tweet.legacy.extended_entities?.media?.forEach((media) => {
    media.indices[0] += textLengthOffset;
    media.indices[1] += textLengthOffset;
  });

  parseEntities(tweet);
  addExtendedTranslation(tweet, translation);
};
