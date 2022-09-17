import twitterText from "twitter-text";
import { TwitterApi } from "../../../models/twitterApi";

export const parseMentions = (tweet: TwitterApi.Tweet.TweetResult) => {
  const nextMentions = twitterText
    .extractMentionsWithIndices(tweet.legacy.full_text)
    .map<TwitterApi.Entity.SimpleEntity.UserMention>((mention) => {
      const prevMention = tweet.legacy.entities.user_mentions.find(
        (existingMention) => existingMention.screen_name === mention.screenName
      );
      return {
        id_str: prevMention ? prevMention.id_str : "",
        name: prevMention ? prevMention.name : "",
        screen_name: mention.screenName,
        indices: mention.indices,
      };
    });

  tweet.legacy.entities.user_mentions = nextMentions;
};
