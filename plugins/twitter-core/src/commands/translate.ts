import { Context, Logger, segment } from "koishi";
import { ITwitterCustomized } from "koishi-plugin-twitter-database";

export const registerTranslateCommand = (
  ctx: Context,
  parentLogger: Logger,
  locale: string
) => {
  const logger = parentLogger.extend("translate");

  ctx
    .command("translate <indexOrUrl: string>")
    .alias("tr")
    .action(async (argv, indexOrUrl) => {
      logger.debug("translate command entered");

      let url: string;
      let translation: string;
      let customized: ITwitterCustomized;

      if (parseInt(indexOrUrl).toString() === indexOrUrl) {
        // is index
        logger.debug("translating for index");

        const history = await ctx.twitterDatabase.selectHistory(
          argv.session.guildId,
          parseInt(indexOrUrl)
        );

        if (history === undefined) {
          return ctx.i18n.render(
            "translate_index_not_found",
            [indexOrUrl],
            locale
          );
        }

        url = `https://twitter.com/${history.url}`;
        const name = history.url.substring(0, history.url.indexOf("/"));
        customized = await ctx.twitterDatabase.selectCustomized(
          argv.session.guildId,
          undefined,
          name
        );
      } else if (
        indexOrUrl.startsWith("https://") &&
        indexOrUrl.indexOf("twitter.com") > -1
      ) {
        // is url
        logger.debug("translating for url");

        url = indexOrUrl;
        const name = url.match(/\w+(?=\/status)/gm);
        if (name === null) {
          return ctx.i18n.render("translate_url_name_not_found", [], locale);
        }
        customized = await ctx.twitterDatabase.selectCustomized(
          argv.session.guildId,
          undefined,
          name[0]
        );
      } else {
        logger.warn(`invalid param detected, indexOrUrl = ${indexOrUrl}`);

        return ctx.i18n.render("translate_invalid_index_or_url", [], locale);
      }

      logger.debug("asking for translation input");

      await argv.session.sendQueued(
        ctx.i18n.render("translate_ask_for_translation", [], locale)
      );
      translation = await argv.session.prompt();
      translation = segment.unescape(translation);

      logger.debug("translation input is parsed");

      const translationResult = await ctx.twitterHandler.translate(
        url,
        translation,
        customized
      );

      logger.debug("translation task finished");

      if (translationResult.screenshotContext.screenshot === undefined) {
        return ctx.i18n.render("screenshot_went_wrong", [], locale);
      }

      logger.debug("translate command exited");

      return segment("image", {
        url: `base64://${translationResult.screenshotContext.screenshot}`,
      });
    });
};
