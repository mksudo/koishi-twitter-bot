import { Context, Logger } from "koishi";
import { ITwitterUser } from "koishi-plugin-twitter-database";
import { loadBackground } from "../utils/loadCustomizedContent/loadBackground";
import { loadCSS } from "../utils/loadCustomizedContent/loadCSS";
import { loadTag } from "../utils/loadCustomizedContent/loadTag";

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

      const configs: ITwitterUser[] = await ctx.twitterDatabase.selectUsers({
        registeredBy: argv.session.guildId,
      });

      const messages: string[] = [];

      if (names.find((name) => name === "*") !== undefined) {
        logger.debug("current command call ask for all users");
        names = configs.map((config) => config.name);
      }

      for (const name of names) {
        logger.debug(`checking config for user ${name}`);

        const currConfig = configs.find((config) => config.name === name);

        if (currConfig === undefined) {
          messages.push(`${name}: cannot find corresponding user`);
          continue;
        }

        messages.push(`${name}: `);

        for (const [key, value] of Object.entries(currConfig)) {
          if (typeof value === "boolean") {
            messages.push(`  ${key}: ${value}`);
          }
        }

        const currCustomized = await ctx.twitterDatabase.selectCustomized(
          argv.session.guildId,
          currConfig.id
        );

        if (argv.options.tag) {
          logger.debug(
            `loading customized tag ${currCustomized.tag} for user ${name}`
          );
          messages.push(`  tag: ${await loadTag(currCustomized.tag)}`);
        }
        if (argv.options.background) {
          logger.debug(
            `loading customized background ${currCustomized.background} for user ${name}`
          );
          messages.push(
            `  background: ${await loadBackground(currCustomized.background)}`
          );
        }
        if (argv.options.css) {
          logger.debug(
            `loading customized css ${currCustomized.css} for user ${name}`
          );
          messages.push(`  css: ${await loadCSS(currCustomized.css)}`);
        }

        logger.debug(`config of user ${name} loaded`);
      }

      logger.debug("check command exited");

      return messages.join("\n");
    });
};
