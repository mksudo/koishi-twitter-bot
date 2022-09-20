import { Context, Logger } from "koishi";
import { ExpandedConfig } from "../models/expandedConfig";
import { loadBackgroundToExpandedConfig } from "../utils/loadToExpandedConfig/loadBackgroundToExpandedConfig";
import { loadCSSToExpandedConfig } from "../utils/loadToExpandedConfig/loadCSSToExpandedConfig";
import { loadTagToExpandedConfig } from "../utils/loadToExpandedConfig/loadTagToExpandedConfig";

export const registerCheckCommand = (
  ctx: Context,
  parentLogger: Logger,
  locale: string
) => {
  const logger = parentLogger.extend("check");
  if (process.env.DEBUG) logger.level = 3;

  ctx
    .command("check <...names>")
    .option("css", "")
    .option("tag", "")
    .option("background", "")
    .action(async (argv, ...names) => {
      logger.debug(`check command entered, names: ${JSON.stringify(names)}`);

      const configs: ExpandedConfig[] = await ctx.twitterDatabase.selectUsers({
        registeredBy: argv.session.guildId,
      });

      const messages: string[] = [];

      if (names.find((name) => name === "*") !== undefined) {
        logger.debug("current command call ask for all users");
        names = configs.map((config) => config.name);
      }

      for (const name of names) {
        logger.debug(`checking user ${name}`);

        const config = configs.find((config) => config.name === name);

        if (config === undefined) {
          messages.push(`${name}: cannot find corresponding user`);
          continue;
        }

        const customized = await ctx.twitterDatabase.selectCustomized(
          argv.session.guildId,
          config.id
        );

        if (customized !== undefined) {
          logger.debug(`loading customized content for user ${name}`);
          if (argv.options.background !== undefined)
            await loadBackgroundToExpandedConfig(config, customized.background);
          if (argv.options.tag !== undefined)
            await loadTagToExpandedConfig(config, customized.tag);
          if (argv.options.css !== undefined)
            await loadCSSToExpandedConfig(config, customized.css);
          logger.debug(`customized content loaded for user ${name}`);
        }

        messages.push(`${name}: ${JSON.stringify(config, undefined, 2)}`);

        logger.debug(`user ${name} checked`);
      }

      logger.debug("check command exited");

      return messages.join("\n");
    });
};
