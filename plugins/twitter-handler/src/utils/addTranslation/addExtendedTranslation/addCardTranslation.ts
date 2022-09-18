import { ICardTranslation } from "../../../models/translation/cardTranslation";
import { TwitterApi } from "../../../models/twitterApi";

/**
 * Add card translation to the given tweet
 * @param tweet the tweet to add card translation to
 * @param translation the card translation block
 */
export const addCardTranslation = (
  tweet: TwitterApi.Tweet.TweetResult,
  translation: ICardTranslation
) => {
  if (!tweet.card) return;

  if (translation.title) {
    const titleValue = tweet.card.legacy.binding_values.find(
      (value) => value.key === translation.title.type
    );
    if (titleValue && titleValue.value.type === "STRING")
      titleValue.value.string_value = translation.title.translation;
  }
  if (translation.description) {
    const descValue = tweet.card.legacy.binding_values.find(
      (value) => value.key === translation.description.type
    );
    if (descValue && descValue.value.type === "STRING")
      descValue.value.string_value = translation.description.translation;
  }
};
