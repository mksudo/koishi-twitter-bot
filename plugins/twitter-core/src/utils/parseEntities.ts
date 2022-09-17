import { segment } from "koishi";
import { ITaskContext } from "koishi-plugin-twitter-handler";

export const parseEntities = (taskContext: ITaskContext) => {
  const tweets = taskContext.screenshotContext.tweets;

  const entities = [];

  for (const tweet of tweets) {
    if (tweet.__typename === "TweetTombstone") continue;

    if (tweet.legacy.entities.media && tweet.legacy.entities.media.length) {
      entities.push(
        ...tweet.legacy.entities.media.map((media) =>
          segment("image", { url: media.media_url_https })
        )
      );
    }
  }

  return entities.join();
};
