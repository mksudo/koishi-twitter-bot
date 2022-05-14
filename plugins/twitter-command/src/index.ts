import fs from "fs";
import { Context, Logger, Schema, segment } from 'koishi';
import BaiduTranslateClient, { name as baiduTranslateName } from "koishi-plugin-baidu-translate";
import MongoDatabaseClient, { CustomizableUserConfigKeys, IGroupConfig, IUserConfig, makeUserConfig, name as mongoDatabaseName, SwitchableUserConfigKeys, UserConfigModifier } from "koishi-plugin-mongo-database";
import TwitterApiClient, { name as twitterApiClientName } from "koishi-plugin-twitter-api-client";
import TwitterScreenshotClient, { name as twitterScreenshotClientName } from "koishi-plugin-twitter-screenshot-client";
import { ETwitterStreamEvent, UserV1, UserV2Result } from 'twitter-api-v2';
import { customAlphabet } from "nanoid/async";
import { alphanumeric } from "nanoid-dictionary";
import { parseScreenshotResultToSegments, saveToFile } from './utils';

export const name = 'twitter-command';

const LOGGER = new Logger(name);

export const using = [baiduTranslateName, mongoDatabaseName, twitterApiClientName, twitterScreenshotClientName] as const;

export interface Config {
  botId: string,
  superUserId: string,
}

export const schema: Schema<Config> = Schema.object({
  botId: Schema.string().required().description("id of bot"),
  superUserId: Schema.string().required().description("id of superuser"),
});

export function apply(ctx: Context, config: Config) {
  const groupCtx = ctx.guild();

  ctx.on("ready", async () => {
    ctx.twitterApiClient.stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      const bot = ctx.bots.get(config.botId);
      if (!bot) {
        LOGGER.warn(`botId ${config.botId} not found`);
        return;
      }

      let tweetType: "tweet" | "retweet" | "comment" = "tweet";
      if (tweet.retweeted_status) tweetType = "retweet";
      else if (tweet.in_reply_to_status_id) tweetType = "comment";

      const username = tweet.user.screen_name;
      LOGGER.debug(`received ${tweetType} from ${username}`);

      const url = `https://twitter.com/${username}/status/${tweet.id}`;

      const groupConfigList = await ctx.mongoDatabase.getGroupConfigListByRegisteredUser(tweet.user.id_str);
      const subscribedList = groupConfigList.filter(groupConfig => groupConfig.userConfigMap[tweet.user.id_str][tweetType]);

      if (subscribedList.length) {
        const gotoResult = await ctx.twitterScreenshotClient.goto(url);
        if (gotoResult.state == false) {
          for (const groupConfig of subscribedList) {
            await bot.sendMessage(groupConfig.guildId, gotoResult.content).catch(() => LOGGER.warn("send message error"));
          }
          return;
        }

        const screenshotResult = await ctx.twitterScreenshotClient.screenshot(gotoResult.content);
        if (screenshotResult.state == false) {
          for (const groupConfig of subscribedList) {
            await bot.sendMessage(groupConfig.guildId, screenshotResult.content).catch(() => LOGGER.warn("send message error"));
          }
          return;
        }

        for (const groupConfig of subscribedList) {
          const userConfig = groupConfig.userConfigMap[tweet.user.id_str];
          const msg = await parseScreenshotResultToSegments(screenshotResult.content, userConfig, ctx.baiduTranslate);
          const historyIndex = await ctx.mongoDatabase.addHistory(groupConfig.guildId, `${username}/status/${tweet.id}`);
          await bot.sendMessage(groupConfig.guildId, msg + `\n[INDEX]: ${historyIndex}`).catch(() => LOGGER.warn("send message error"));
        }
      }
    });


    const uidList = await ctx.mongoDatabase.getRegisteredUserIdList();
    LOGGER.debug(`establishing stream with user ids ${JSON.stringify(uidList)}`);

    await ctx.twitterApiClient.updateFollowers(uidList);

    LOGGER.debug("plugin start");
  });

  ctx.on("dispose", async () => {
    ctx.twitterApiClient.stream.removeAllListeners(ETwitterStreamEvent.Data);
    LOGGER.debug("plugin end");
  });

  ctx.on("guild-deleted", async (session) => {
    await ctx.mongoDatabase.deleteGroupConfig(session.guildId);
    const uidList = await ctx.mongoDatabase.getRegisteredUserIdList();
    await ctx.twitterApiClient.updateFollowers(uidList);
    LOGGER.debug(`establishing stream with user ids ${JSON.stringify(uidList)}`);
  });

  ctx.command("screenshot <url: string>", "take screenshot for a tweet")
    .alias("scr")
    .example("scr https://twitter.com/Twitter/status/1509206476874784769")
    .action(async (argv, url) => {
      LOGGER.debug(`screenshot command for ${url} start`);

      const gotoResult = await ctx.twitterScreenshotClient.goto(url);
      if (gotoResult.state == false) return gotoResult.content;
      const screenshotResult = await ctx.twitterScreenshotClient.screenshot(gotoResult.content);
      if (screenshotResult.state == false) return screenshotResult.content;

      const msg = await parseScreenshotResultToSegments(screenshotResult.content, makeUserConfig("", ""), ctx.baiduTranslate);

      return msg;
    });

  groupCtx.command("announce <content: text>", "send message to all registered groups", { hidden: true })
    .alias("ann")
    .action(async (argv, content) => {
      if (argv.session.userId == config.superUserId) {
        const groupConfigList = await ctx.mongoDatabase.getAllGroupConfig();
        const guildList = groupConfigList.map(groupConfig => groupConfig.guildId);
        let resultMsg = "";
        for (const guild of guildList) {
          await argv.session.bot.sendMessage(guild, content).then(() => {
            resultMsg += `${guild}: success`;
          }, () => {
            resultMsg += `${guild}: failed`;
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return resultMsg;
      }
    });

  groupCtx.command("translate <indexOrUrl: string>", "translate a tweet with provided translation")
    .alias("tr")
    .example("tr https://twitter.com/Twitter/status/1509206476874784769 or tr 123")
    .action(async (argv, indexOrUrl) => {
      LOGGER.debug("translate start");

      let url: string;
      let translation: string;
      let userConfig: IUserConfig;

      if (parseInt(indexOrUrl).toString() == indexOrUrl) {
        // is index
        LOGGER.debug(`translate for history index ${indexOrUrl}`);

        const historyResult = await ctx.mongoDatabase.getHistory(argv.session.guildId, parseInt(indexOrUrl));

        if (historyResult.state == false) return historyResult.content;

        url = `https://twitter.com/${historyResult.content}`;
        const userName = historyResult.content.substring(0, historyResult.content.indexOf("/"));

        const userConfigResult = await ctx.mongoDatabase.getUserConfig(argv.session.guildId, undefined, userName);

        if (userConfigResult.state == false) return userConfigResult.content;

        userConfig = userConfigResult.content;
      } else if (indexOrUrl.startsWith("https://twitter.com/")) {
        // is url
        LOGGER.debug(`translate for url ${indexOrUrl}`);
        url = indexOrUrl;

        // dummy config
        userConfig = makeUserConfig("", "");
      } else {
        return "unknown input, please input url or index number";
      }

      // get user translation input
      await argv.session.send("please input your translation");
      translation = segment.unescape(await argv.session.prompt());
      LOGGER.debug(`received user translation ${translation}`);

      // add translation and take screenshot
      LOGGER.debug(`start taking screenshot ...`);
      const gotoResult = await ctx.twitterScreenshotClient.goto(url);
      if (gotoResult.state == false) return gotoResult.content;
      const screenshotResult = await ctx.twitterScreenshotClient.screenshot(gotoResult.content);
      if (screenshotResult.state == false) return screenshotResult.content;

      LOGGER.debug(`take screenshot completed`);

      return segment("image", { url: "base64://" + screenshotResult.content.screenshotBase64 });
    });

  groupCtx.command("check <username: string>")
    .example("check mkZH0740")
    .action(async (argv, username) => {
      const userConfigList: IUserConfig[] = [];

      if (username == "*") {
        const groupConfig = await ctx.mongoDatabase.getGroupConfig(argv.session.guildId);
        userConfigList.push(...Object.values(groupConfig.userConfigMap));
      } else {
        const userConfigResult = await ctx.mongoDatabase.getUserConfig(argv.session.guildId, undefined, username);
        if (userConfigResult.state == false) return userConfigResult.content;

        userConfigList.push(userConfigResult.content);
      }

      const msgList: string[] = [];
      for (const userConfig of userConfigList) {
        msgList.push(JSON.stringify(userConfig));
      }

      return msgList.join("\n");
    });

  groupCtx.command("set <username: string> <...keys>", "set user config for current group")
    .option("off", "set switch state")
    .example("set * tweet retweet tag --off")
    .check(async (argv, username, ...keys) => {
      for (const key of keys) {
        if (!SwitchableUserConfigKeys.includes(key as (typeof SwitchableUserConfigKeys)[number]) &&
          !CustomizableUserConfigKeys.includes(key as ((typeof CustomizableUserConfigKeys)[number]))) {
          return `invalid key ${key}`;
        }
      }
    })
    .action(async (argv, username, ...keys) => {
      LOGGER.debug(`seting ${keys.join()} for user ${username} and group ${argv.session.guildId}`);
      const userConfigList: IUserConfig[] = [];

      if (username == "*") {
        const groupConfig = await ctx.mongoDatabase.getGroupConfig(argv.session.guildId);
        userConfigList.push(...Object.values(groupConfig.userConfigMap));
      } else {
        const userConfigResult = await ctx.mongoDatabase.getUserConfig(argv.session.guildId, undefined, username);
        if (userConfigResult.state == false) return userConfigResult.content;

        userConfigList.push(userConfigResult.content);
      }

      const modifier: UserConfigModifier = {};
      const off = argv.options.off ? true : false;
      for (const key of keys) {
        if (SwitchableUserConfigKeys.includes(key as (typeof SwitchableUserConfigKeys)[number])) {
          modifier[key] = !off;
        } else {
          await argv.session.send(`please input content for ${key}`);
          const result = segment.parse(await argv.session.prompt());
          if (result.length != 1) return `invalid amount of content supplied for setting ${key}`;
          const content = result[0];

          const filenameGenerator = customAlphabet(alphanumeric, 10);
          const filename = await filenameGenerator();
          const suffix = key == "css" ? "css" : "png";
          const dir = `./resources/${argv.session.guildId}`;

          await fs.promises.mkdir(dir, { recursive: true });

          const filepath = `${dir}/${filename}.${suffix}`;
          if (key == "css" && content.type != "text" || key != "css" && content.type != "image") return "invalid content supplied";

          await saveToFile(content, filepath).then(() => {
            modifier[key] = filepath;
          }, (err) => {
            LOGGER.warn(`${err}`);
            return argv.session.sendQueued(`${err}`);
          });
        }

        const msgList: string[] = [];
        for (const userConfig of userConfigList) {
          const result = await ctx.mongoDatabase.modifyUserConfig(argv.session.guildId, modifier, userConfig.userid);
          msgList.push(result.content);
        }

        return msgList.join("\n");
      }
    });

  groupCtx.command("user [username: string]")
    .option("add", "--add add user")
    .option("delete", "--delete delete user")
    .example(`user --add mkZH0740`)
    .action(async (argv, username) => {
      if (username) {
        const user: UserV1 = await ctx.twitterApiClient.client.user({ screen_name: username });
        if (!(user)) return `error while finding user`;
        if (argv.options.add) {
          const result = await ctx.mongoDatabase.createUserConfig(argv.session.guildId, user.id_str, user.screen_name);
          if (result.state == true) {
            const userIdList = await ctx.mongoDatabase.getRegisteredUserIdList();
            await ctx.twitterApiClient.updateFollowers([...userIdList]);
          }
          return result.content;
        } else if (argv.options.delete) {
          const result = await ctx.mongoDatabase.deleteUserConfig(argv.session.guildId, user.id_str, user.screen_name);
          if (result.state == true) {
            const userIdList = await ctx.mongoDatabase.getRegisteredUserIdList();
            await ctx.twitterApiClient.updateFollowers([...userIdList]);
          }
          return result.content;
        } else {
          const userConfig = await ctx.mongoDatabase.getUserConfig(argv.session.guildId, user.id_str);
          if (userConfig.state == false) {
            return userConfig.content;
          }
          return `config for ${username} is ${JSON.stringify(userConfig.content)}`;
        }
      } else {
        const groupConfig: IGroupConfig = await ctx.mongoDatabase.getGroupConfig(argv.session.guildId);
        return `user registered: ${Object.keys(groupConfig.userConfigMap).join()}`;
      }
    });
}
