import { IQuoteTranslation } from "../../models/translation/quoteTranslation";
import { ITranslation } from "../../models/translation/translation";
import { TwitterApi } from "../../models/twitterApi";
import { addCardTranslation } from "./addExtendedTranslation/addCardTranslation";
import { addPollTranslation } from "./addExtendedTranslation/addPollTranslation";
import { parseEntities } from "./parseEntities/parseEntities";

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

export const addTranslation = (
  tweet: TwitterApi.Tweet.TweetResult,
  translation: ITranslation | IQuoteTranslation,
  isMajorTweet?: boolean
) => {
  const prevTextLength = tweet.legacy.full_text.length;
  tweet.legacy.full_text += "\n" + translation.translation;
  const textLengthOffset = tweet.legacy.full_text.length - prevTextLength;

  tweet.legacy.display_text_range[1] = Number.MAX_SAFE_INTEGER;
  tweet.legacy.entities.media?.forEach((media) => {
    media.indices[0] += textLengthOffset;
    media.indices[1] += textLengthOffset;
  });

  parseEntities(tweet);
  addExtendedTranslation(tweet, translation);
};
