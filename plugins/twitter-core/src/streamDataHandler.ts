import { Context, Logger } from "koishi";
import { TweetType } from "koishi-plugin-twitter-api";
import { ITaskContext } from "koishi-plugin-twitter-handler";
import { ETwitterStreamEvent } from "twitter-api-v2";
import { Config } from ".";
import { buildText } from "./utils/buildText";
import { parseEntities } from "./utils/parseEntities";
import { parseTweet } from "./utils/parseTweet";

export const registerStreamDataHandler = (
  ctx: Context,
  logger: Logger,
  config: Config,
  locale: string
) => {
  if (ctx.twitterApi.getIsDataHandlerRegistered()) {
    logger.debug("data handler already registered, skipping");
    return;
  }

  ctx.twitterApi
    .getTwitterStream()
    .on(ETwitterStreamEvent.Data, async (tweet) => {
      logger.debug(
        `bots: ${JSON.stringify(ctx.bots.map((bot) => bot.selfId))}`
      );

      const bot = ctx.bots.find(
        (existingBot) => existingBot.selfId === config.selfId
      );

      if (bot === undefined) {
        logger.warn(`cannot find bot ${config.selfId}`);
        return;
      }

      let tweetType: TweetType = "tweet";
      if (tweet.data.in_reply_to_user_id) tweetType = "comment";
      else if (
        tweet.data.referenced_tweets &&
        tweet.data.referenced_tweets[0].type === "retweeted"
      )
        tweetType = "retweet";

      const name = tweet.includes.users[0]?.username;
      if (name === undefined) {
        logger.warn("cannot find name from tweet data");
        return;
      }

      logger.debug(`received type ${tweetType} tweet from ${name}`);

      const url = `https://twitter.com/${name}/status/${tweet.data.id}`;

      const userConfigs = await ctx.twitterDatabase.selectUsers({
        id: tweet.includes.users[0]?.id,
      });
      const registeredUserConfigs = userConfigs.filter(
        (userConfig) => userConfig[tweetType]
      );

      if (registeredUserConfigs.length < 1) {
        logger.debug(`no registry found for current tweet`);
        return;
      }

      const screenshotResult: ITaskContext =
        await ctx.twitterHandler.screenshot(url);

      if (screenshotResult.screenshotContext.screenshot === undefined) {
        logger.warn("something went wrong during screenshot");
        // try to send the tweet url to group when screenshot fails
        for (const userConfig of registeredUserConfigs) {
          await bot
            .sendMessage(
              userConfig.registeredBy,
              ctx.i18n.text([locale], ["stream_screenshot_went_wrong"], [url])
            )
            .catch((err) => {
              logger.warn(
                `send message to group ${userConfig.registeredBy} failed`
              );
            });
        }

        return;
      }

      const text = parseTweet(screenshotResult);
      const entityText = parseEntities(screenshotResult);

      for (const userConfig of registeredUserConfigs) {
        let currText = await buildText(
          ctx,
          screenshotResult,
          userConfig,
          text,
          entityText,
          locale
        );

        const history = await ctx.twitterDatabase.addHistory(
          userConfig.registeredBy,
          `${name}/status/${tweet.data.id}`
        );

        currText += ctx.i18n.text(
          [locale],
          ["stream_ondata_text_index"],
          [history.index]
        );

        await bot
          .sendMessage(userConfig.registeredBy, currText)
          .catch((err) => {
            logger.warn(
              `send tweet to group ${userConfig.registeredBy} failed`
            );
          });
      }
    });

  ctx.twitterApi.setIsDataHandlerRegistered(true);
};
