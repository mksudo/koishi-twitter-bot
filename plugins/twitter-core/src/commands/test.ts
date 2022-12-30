import { Context, Logger } from "koishi";

export const registerTestCommand = (
  ctx: Context,
  parentLogger: Logger,
  locale: string
) => {
  const logger = parentLogger.extend("test");
  if (process.env.DEBUG) logger.level = 3;

  ctx.command("test <message: text>").action(async (argv, message) => {
    logger.debug(`received message ${message}`);

    return message;
  });
};
