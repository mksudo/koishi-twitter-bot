import twitterText from "twitter-text";
import { TwitterApi } from "../../../models/twitterApi";

export const parseUrls = (tweet: TwitterApi.Tweet.TweetResult) => {
  const nextUrls = twitterText
    .extractUrlsWithIndices(tweet.legacy.full_text)
    .map<TwitterApi.Entity.SimpleEntity.Url>((url) => {
      if (
        tweet.legacy.entities.media &&
        tweet.legacy.entities.media.find((media) => media.url === url.url)
      )
        return undefined;
      const prevUrl = tweet.legacy.entities.urls.find(
        (existingUrl) => existingUrl.display_url === url.url
      );
      return {
        display_url: prevUrl ? prevUrl.display_url : url.url,
        expanded_url: prevUrl ? prevUrl.expanded_url : url.url,
        url: prevUrl ? prevUrl.url : url.url,
        indices: url.indices,
      };
    })
    .filter((url) => url !== undefined);

  tweet.legacy.entities.urls = nextUrls;
};
