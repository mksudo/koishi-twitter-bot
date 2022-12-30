import { ITaskContext } from "koishi-plugin-twitter-handler";

export const parseTweet = (taskContext: ITaskContext) => {
  const tweets = taskContext.screenshotContext.tweets;
  const onlyOneTweet = tweets.length === 1;

  let parsedTweets = tweets.map((tweet, index) => {
    const head = onlyOneTweet ? "" : `${index + 1}: `;
    let body = "";
    let quote = "";

    if (tweet.__typename === "Tweet") {
      body = tweet.legacy.full_text;
      if (tweet.quoted_status_result !== undefined) {
        quote = tweet.quoted_status_result.result.legacy.full_text;
      }
    } else {
      body = tweet.tombstone.text.text;
    }

    return head + body + (quote === "" ? "" : `\n[QUOTE] ${quote}`);
  });

  return parsedTweets.join("\n");
};
