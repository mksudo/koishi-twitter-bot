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
        return ctx.i18n.render(
          "set_check_invalid_key",
          [invalidKeys.join("; ")],
          locale
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
        configs.push(...currConfigs);
      } else {
        logger.debug(`getting config for user ${name}`);

        const currConfig = await ctx.twitterDatabase.selectUser(
          argv.session.guildId,
          undefined,
          name
        );
        if (currConfig === undefined)
          return ctx.i18n.render("set_user_not_found", [name], locale);
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
            await argv.session.sendQueued(
              ctx.i18n.render("set_ask_for_customized_content", [key], locale)
            );
            const result = await argv.session.prompt();
            const parsedResult = segment.parse(result)[0];

            if (key === "css") {
              if (parsedResult.type !== "text") {
                return ctx.i18n.render(
                  "set_invalid_customized_content_type",
                  ["text", parsedResult.type],
                  undefined
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
                return ctx.i18n.render(
                  "set_invalid_customized_content_type",
                  ["image", parsedResult.type],
                  undefined
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
            ctx.i18n.render(
              userModifyResult ? "set_user_succeeded" : "set_user_failed",
              [config.name],
              locale
            )
          );
        }

        if (Object.keys(customizedModifier).length > 3) {
          logger.debug("customized contents are modified");

          const customizedModifyResult =
            await ctx.twitterDatabase.modifyCustomized(customizedModifier);
          messages.push(
            ctx.i18n.render(
              customizedModifyResult
                ? "set_customized_succeeded"
                : "set_customized_failed",
              [config.name],
              locale
            )
          );
        }
      }

      logger.debug("set command exited");

      return messages.join("\n");
    });
};
