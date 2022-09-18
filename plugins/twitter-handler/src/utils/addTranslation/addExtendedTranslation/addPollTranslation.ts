import { IPollTranslation } from "../../../models/translation/pollTranslation";
import { TwitterApi } from "../../../models/twitterApi";

/**
 * Add poll translation to the given tweet
 * @param tweet the tweet to add poll translation to
 * @param translation poll translation block
 */
export const addPollTranslation = (
  tweet: TwitterApi.Tweet.TweetResult,
  translation: IPollTranslation
) => {
  if (!tweet.card) return;

  for (const choiceTranslation of translation.choices) {
    const choiceValue = tweet.card.legacy.binding_values.find(
      (value) => value.key === `choice${choiceTranslation.index}_label`
    );
    if (choiceValue && choiceValue.value.type === "STRING")
      choiceValue.value.string_value = choiceTranslation.translation;
  }
};
