import { Argv, Context, Logger, Schema, segment } from "koishi";
import TwitterDatabase, {
  ITwitterCustomized,
  ITwitterUser,
  Modifier,
} from "koishi-plugin-twitter-database";
import TwitterApi, {
  ETwitterStreamEvent,
  TweetType,
} from "koishi-plugin-twitter-api";
import TwitterHandler, { ITaskContext } from "koishi-plugin-twitter-handler";
import { parseTweet } from "./utils/parseTweet";
import { parseEntities } from "./utils/parseEntities";
import { buildText } from "./utils/buildText";
import { getDummyUser } from "./utils/getDummyUser";
import { ExpandedConfig } from "./models/expandedConfig";
import { loadBackgroundToExpandedConfig } from "./utils/loadToExpandedConfig/loadBackgroundToExpandedConfig";
import { loadTagToExpandedConfig } from "./utils/loadToExpandedConfig/loadTagToExpandedConfig";
import { loadCSSToExpandedConfig } from "./utils/loadToExpandedConfig/loadCSSToExpandedConfig";
import { saveCSSContent } from "./utils/saveCustomizedContent/saveCSSContent";
import { saveImageContent } from "./utils/saveCustomizedContent/saveImageContent";
import { registerScreenshotCommand } from "./commands/screenshot";
import { registerTranslateCommand } from "./commands/translate";
import { registerCheckCommand } from "./commands/check";
import { registerSetCommand } from "./commands/set";
import { registerUserCommand } from "./commands/user";
import { registerStreamDataHandler } from "./streamDataHandler";

const locale = "zh";
export const name = "twitterCore";
export const using = [
  TwitterDatabase.name,
  TwitterApi.name,
  TwitterHandler.name,
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
  // only care about group commands
  ctx.on("ready", async () => {
    logger.debug("ready callback entered");

    ctx.i18n.define(locale, require("./locales/zh"));

    registerStreamDataHandler(ctx, logger, config, locale);

    const users = await ctx.twitterDatabase.selectUsers({});
    const userIds = [...new Map(users.map((user) => [user.id, user])).values()];

    await ctx.twitterApi.updateStreamRules(userIds);
    await ctx.twitterApi.getTwitterStream().connect();

    logger.debug("ready callback exited");
  });

  const groupCtx = ctx.guild();

  registerScreenshotCommand(ctx, logger, locale);

  registerTranslateCommand(groupCtx, logger, locale);

  registerCheckCommand(groupCtx, logger, locale);

  registerSetCommand(groupCtx, logger, locale);

  registerUserCommand(groupCtx, logger, locale);
}
