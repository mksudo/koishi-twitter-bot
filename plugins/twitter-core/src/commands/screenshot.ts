import { Context, Logger } from "koishi";
import { buildText } from "../utils/buildText";
import { getDummyUser } from "../utils/getDummyUser";
import { parseEntities } from "../utils/parseEntities";
import { parseTweet } from "../utils/parseTweet";

export const registerScreenshotCommand = (
  ctx: Context,
  parentLogger: Logger,
  locale: string
) => {
  const logger = parentLogger.extend("screenshot");

  ctx
    .command("screenshot <url: string>")
    .alias("scr")
    .action(async (argv, url) => {
      logger.debug("screenshot command entered");

      const screenshotResult = await ctx.twitterHandler.screenshot(url);

      if (screenshotResult.screenshotContext.screenshot === undefined) {
        logger.warn("something went wrong during screenshot");
        return ctx.i18n.render("screenshot_went_wrong", [], locale);
      }

      logger.debug("parsing text to string");

      const text = parseTweet(screenshotResult);

      logger.debug("parsing entities to string");

      const entityText = parseEntities(screenshotResult);

      logger.debug("building final result text");

      const message = await buildText(
        ctx,
        screenshotResult,
        getDummyUser(),
        text,
        entityText,
        locale
      );

      logger.debug("final result built");

      return message;
    });
};
