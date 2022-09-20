import { Context, Logger, Schema } from "koishi";
import TwitterDatabase, {
  name as twitterDatabaseName,
} from "koishi-plugin-twitter-database";
import TwitterApi, { name as twitterApiName } from "koishi-plugin-twitter-api";
import TwitterHandler, {
  name as twitterHandlerName,
} from "koishi-plugin-twitter-handler";
import { registerScreenshotCommand } from "./commands/screenshot";
import { registerTranslateCommand } from "./commands/translate";
import { registerCheckCommand } from "./commands/check";
import { registerSetCommand } from "./commands/set";
import { registerUserCommand } from "./commands/user";
import { registerStreamDataHandler } from "./streamDataHandler";
import { registerTestCommand } from "./commands/test";

const locale = "zh";
export const name = "twitterCore";
export const using = [
  twitterDatabaseName,
  twitterApiName,
  twitterHandlerName,
] as const;

const logger = new Logger(name);
if (process.env.DEBUG) logger.level = 3;

export interface Config {
  selfId: string;
  superUserId: string;
}

export const Config: Schema<Config> = Schema.object({
  selfId: Schema.string().required().description("id of bot"),
  superUserId: Schema.string().required().description("id of superuser"),
});

export function apply(ctx: Context, config: Config) {
  logger.info("core loading");
  // only care about group commands
  ctx.on("ready", async () => {
    logger.warn("ready callback entered");

    ctx.i18n.define(locale, require("./locales/zh.yml"));

    logger.debug(JSON.stringify(ctx.i18n._data, undefined, 2));

    const users = await ctx.twitterDatabase.selectUsers({});
    const userIds = [...new Map(users.map((user) => [user.id, user])).values()];

    logger.debug(`loading users ${JSON.stringify(userIds)}`);

    if (userIds.length > 0) {
      await ctx.twitterApi.updateStreamRules(userIds);

      registerStreamDataHandler(ctx, logger, config, locale);

      await ctx.twitterApi.getTwitterStream().connect();
    }

    logger.debug("ready callback exited");
  });

  const groupCtx = ctx.guild();

  registerScreenshotCommand(ctx, logger, locale);

  registerTranslateCommand(groupCtx, logger, locale);

  registerCheckCommand(groupCtx, logger, locale);

  registerSetCommand(groupCtx, logger, locale);

  registerUserCommand(groupCtx, logger, config, locale);

  registerTestCommand(ctx, logger, locale);
}
