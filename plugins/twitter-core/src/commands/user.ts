import { Context, Logger } from "koishi";

export const registerUserCommand = (
  ctx: Context,
  parentLogger: Logger,
  locale: string
) => {
  const logger = parentLogger.extend("user");

  ctx
    .command("user <...names>")
    .option("add", "")
    .option("delete", "")
    .check(async (argv, ...names) => {
      logger.debug("check for user command entered");

      if (argv.options.add === undefined && argv.options.delete === undefined) {
        return ctx.i18n.render("user_option_undefined", [], locale);
      }
      if (names.length === 0) {
        return ctx.i18n.render("user_no_name_supplied", [], locale);
      }
    })
    .action(async (argv, ...names) => {
      logger.debug("user command entered");
      let updated = false;
      const messages: string[] = [];

      for (const name of names) {
        const twitterUser = await ctx.twitterApi.selectUser(undefined, name);
        if (twitterUser === undefined)
          return ctx.i18n.render("user_name_not_found", [name], locale);
        if (argv.options.add) {
          const isOk = await ctx.twitterDatabase.registerUser(
            argv.session.guildId,
            undefined,
            name
          );
          messages.push(
            ctx.i18n.render(
              isOk ? "user_register_complete" : "user_register_failed",
              [name],
              locale
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
            ctx.i18n.render(
              isOk ? "user_unregister_complete" : "user_unregister_failed",
              [name],
              locale
            )
          );
          updated = updated || isOk;
        }
      }

      if (updated) {
        const users = await ctx.twitterDatabase.selectUsers({});
        await ctx.twitterApi.updateStreamRules(users);
      }

      logger.debug("user command exited");

      return messages.join("\n");
    });
};
