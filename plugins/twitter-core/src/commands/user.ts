import { Context, Logger } from "koishi";
import { Config } from "..";
import { registerStreamDataHandler } from "../streamDataHandler";

export const registerUserCommand = (
  ctx: Context,
  parentLogger: Logger,
  config: Config,
  locale: string
) => {
  const logger = parentLogger.extend("user");
  if (process.env.DEBUG) logger.level = 3;

  ctx
    .command("user <...names>")
    .option("add", "")
    .option("delete", "")
    .check(async (argv, ...names) => {
      logger.debug("check for user command entered");

      if (argv.options.add === undefined && argv.options.delete === undefined) {
        return ctx.i18n.text([locale], ["user_option_undefined"], []);
      }
      if (names.length === 0) {
        return ctx.i18n.text([locale], ["user_no_name_supplied"], []);
      }
    })
    .action(async (argv, ...names) => {
      logger.debug("user command entered");
      let updated = false;
      const messages: string[] = [];

      for (const name of names) {
        const twitterUser = await ctx.twitterApi.selectUser(undefined, name);
        if (twitterUser === undefined)
          return ctx.i18n.text([locale], ["user_name_not_found"], [name]);
        if (argv.options.add) {
          const isOk = await ctx.twitterDatabase.registerUser(
            argv.session.guildId,
            twitterUser.data.id,
            name
          );
          messages.push(
            ctx.i18n.text(
              [locale],
              [isOk ? "user_register_complete" : "user_register_failed"],
              [name]
            )
          );
          updated = updated || isOk;
        } else {
          const isOk = await ctx.twitterDatabase.unregisterUser(
            argv.session.guildId,
            undefined,
            name
          );
          messages.push(
            ctx.i18n.text(
              [locale],
              [isOk ? "user_unregister_complete" : "user_unregister_failed"],
              [name]
            )
          );
          updated = updated || isOk;
        }
      }

      if (updated) {
        const users = await ctx.twitterDatabase.selectUsers({});
        const userIds = [
          ...new Map(users.map((user) => [user.id, user])).values(),
        ];

        logger.debug(`loading users ${JSON.stringify(userIds)}`);

        await ctx.twitterApi.updateStreamRules(users);

        registerStreamDataHandler(ctx, parentLogger, config, locale);
      }

      logger.debug("user command exited");

      return messages.join("\n");
    });
};
