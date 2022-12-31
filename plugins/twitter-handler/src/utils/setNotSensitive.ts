import { TwitterApi } from "../models/twitterApi";

/**
 * Set all provided tweets unsensitive
 * @param tweet all tweets
 */
export const setNotSensitive = (
  tweet: TwitterApi.Tweet.TweetResult | TwitterApi.Tweet.TweetTombstone
) => {
  if (tweet.__typename === "TweetTombstone") return;

  const userResult = tweet.core.user_results.result;

  if (userResult.legacy.possibly_sensitive)
    userResult.legacy.possibly_sensitive = false;

  if (tweet.legacy.possibly_sensitive) tweet.legacy.possibly_sensitive = false;

  if (tweet.legacy.possibly_sensitive_editable)
    tweet.legacy.possibly_sensitive_editable = false;

  tweet.is_translatable = false;

  if (
    tweet.legacy.extended_entities &&
    tweet.legacy.extended_entities.media &&
    tweet.legacy.extended_entities.media.length
  ) {
    tweet.legacy.extended_entities.media.forEach((extendedMedia) => {
      if (extendedMedia.sensitive_media_warning)
        extendedMedia.sensitive_media_warning = undefined;
    });
  }
};
