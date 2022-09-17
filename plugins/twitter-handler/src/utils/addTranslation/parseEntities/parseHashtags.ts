import twitterText from "twitter-text";
import { TwitterApi } from "../../../models/twitterApi";

export const parseHashtags = (tweet: TwitterApi.Tweet.TweetResult) => {
  const nextHashtags = twitterText
    .extractHashtagsWithIndices(tweet.legacy.full_text)
    .map<TwitterApi.Entity.SimpleEntity.Hashtag>((hashtag) => {
      return {
        text: hashtag.hashtag,
        indices: hashtag.indices,
      };
    });

  tweet.legacy.entities.hashtags = nextHashtags;
};
