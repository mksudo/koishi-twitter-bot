import { Context, Logger, segment } from "koishi";
import {
  ITwitterCustomized,
  ITwitterUser,
  Modifier,
} from "koishi-plugin-twitter-database";
import { getDummyUser } from "../utils/getDummyUser";
import { saveCSSContent } from "../utils/saveCustomizedContent/saveCSSContent";
import { saveImageContent } from "../utils/saveCustomizedContent/saveImageContent";

export const registerSetCommand = (
  ctx: Context,
  parentLogger: Logger,
  locale: string
) => {
  const logger = parentLogger.extend("set");
  if (process.env.DEBUG) logger.level = 3;

  ctx
    .command("set <name: string> <...keys>")
    .option("off", "")
    .check(async (argv, name, ...keys) => {
      logger.debug("check for set command entered");

      type CustomizedKey = (keyof ITwitterCustomized)[];
      const customizedKeys: CustomizedKey = ["background", "css", "tag"];

      const dummyConfig = getDummyUser();

      const invalidKeys = keys.filter(
        (key) =>
          typeof dummyConfig[key] !== "boolean" &&
          !customizedKeys.some((customizedKey) => customizedKey === key)
      );

      if (invalidKeys.length !== 0)
        return ctx.i18n.text(
          [locale],
          ["set_check_invalid_key"],
          [invalidKeys.join("; ")]
        );
    })
    .action(async (argv, name, ...keys) => {
      logger.debug("set command entered");

      const configs: ITwitterUser[] = [];
      const dummyUser = getDummyUser();

      if (name === "*") {
        logger.debug("getting configs for all users");

        const currConfigs = await ctx.twitterDatabase.selectUsers({
          registeredBy: argv.session.guildId,
        });

        if (currConfigs.length === 0) {
          logger.debug("exiting with no config found");

          return ctx.i18n.text(
            [locale],
            ["set_no_user_found_for_all_user_option"],
            []
          );
        }

        configs.push(...currConfigs);
      } else {
        logger.debug(`getting config for user ${name}`);

        const currConfig = await ctx.twitterDatabase.selectUser(
          argv.session.guildId,
          undefined,
          name
        );
        if (currConfig === undefined)
          return ctx.i18n.text([locale], ["set_user_not_found"], [name]);
        configs.push(currConfig);
      }

      const messages: string[] = [];

      logger.debug("setting configs");

      for (const config of configs) {
        const userModifier: Modifier<ITwitterUser> = {
          registeredBy: argv.session.guildId,
          id: config.id,
          name: config.name,
        };
        const customizedModifier: Modifier<ITwitterCustomized> = {
          registeredBy: argv.session.guildId,
          id: config.id,
          name: config.name,
        };

        for (const key of keys) {
          if (dummyUser[key] !== undefined) {
            userModifier[key] = argv.options.off ? true : false;
          } else {
            await argv.session.send(
              ctx.i18n.text([locale], ["set_ask_for_customized_content"], [key])
            );
            logger.debug("waiting for prompt");
            const result = await argv.session.prompt();
            let parsedResult = segment.parse(result)[0];

            if (key === "css") {
              if (parsedResult.type !== "text") {
                return ctx.i18n.text(
                  [locale],
                  ["set_invalid_customized_content_type"],
                  ["text", parsedResult.type]
                );
              } else {
                const cssFilePath = await saveCSSContent(
                  parsedResult.attrs["content"],
                  argv.session.guildId
                );
                customizedModifier.css = cssFilePath;
              }
            } else if (key === "tag" || key === "background") {
              if (parsedResult.type !== "image") {
                return ctx.i18n.text(
                  [locale],
                  ["set_invalid_customized_content_type"],
                  ["image"]
                );
              } else {
                const imageFilePath = await saveImageContent(
                  parsedResult.attrs["url"],
                  argv.session.guildId
                );
                customizedModifier[key] = imageFilePath;
              }
            }
          }
        }

        if (Object.keys(userModifier).length > 3) {
          logger.debug("settings are modified");

          const userModifyResult = await ctx.twitterDatabase.modifyUser(
            userModifier
          );
          messages.push(
            ctx.i18n.text(
              [locale],
              [userModifyResult ? "set_user_succeeded" : "set_user_failed"],
              [config.name]
            )
          );
        }

        if (Object.keys(customizedModifier).length > 3) {
          logger.debug("customized contents are modified");
          await ctx.twitterDatabase.modifyCustomized(customizedModifier);
          messages.push(
            ctx.i18n.text([locale], ["set_customized_succeeded"], [config.name])
          );
        }
      }

      logger.debug("set command exited");

      return messages.join("\n");
    });
};
