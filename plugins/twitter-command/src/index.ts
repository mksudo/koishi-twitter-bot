import fs from "fs";
import { Context, Logger, Schema, segment } from 'koishi';
import BaiduTranslateClient, { name as baiduTranslateName } from "koishi-plugin-baidu-translate";
import MongoDatabaseClient, { CustomizableUserConfigKeys, IGroupConfig, IUserConfig, makeUserConfig, name as mongoDatabaseName, SwitchableUserConfigKeys, UserConfigModifier } from "koishi-plugin-mongo-database";
import TwitterApiClient, { name as twitterApiClientName } from "koishi-plugin-twitter-api-client";
import TwitterScreenshotClient, { name as twitterScreenshotClientName } from "koishi-plugin-twitter-screenshot-client";
import { ETwitterStreamEvent, TweetV2SingleResult } from 'twitter-api-v2';
import { customAlphabet } from "nanoid/async";
import { alphanumeric } from "nanoid-dictionary";
import { getParsedText, parseScreenshotResult, saveToFile } from './utils';

export const name = 'twitterCommand';
const commandTerminator = ".abort";

const LOGGER = new Logger(name);
LOGGER.level = 3;

export const using = [baiduTranslateName, mongoDatabaseName, twitterApiClientName, twitterScreenshotClientName] as const;

export interface Config {
  botId: string,
  superUserId: string,
}

export const schema: Schema<Config> = Schema.object({
  botId: Schema.string().required().description("id of bot"),
  superUserId: Schema.string().required().description("id of superuser"),
});

function createTwitterStreamEventHandler(event: string, loggerFunction: Logger.Function, format?: string) {
  return (...args: any[]) => format ? loggerFunction(`stream event ${event}${format}`, args) : loggerFunction(`stream event ${event}`);
}

export function apply(ctx: Context, config: Config) {
  const dataErrorEventHandler = createTwitterStreamEventHandler("data error", LOGGER.warn, "%s");
  const connectErrorEventHandler = createTwitterStreamEventHandler("connect error", LOGGER.warn, "%s");
  const reconnectErrorEventHandler = createTwitterStreamEventHandler("reconnect error", LOGGER.warn, "%s");
  const connectionErrorEventHandler = createTwitterStreamEventHandler("connection error", LOGGER.warn, "%s");
  const tweetParseErrorEventHandler = createTwitterStreamEventHandler("tweet parse error", LOGGER.warn, "%s");

  const connectedEventHandler = createTwitterStreamEventHandler("connected", LOGGER.debug);
  const connectionClosedEventHandler = createTwitterStreamEventHandler("connection closed", LOGGER.warn);
  const connectionLostEventHandler = createTwitterStreamEventHandler("connection lost", LOGGER.warn);
  const reconnectedEventHandler = createTwitterStreamEventHandler("reconnected", LOGGER.debug);
  const reconnectAttemptEventHandler = createTwitterStreamEventHandler("reconnect attempt", LOGGER.debug, "reconnect time %d");

  const dataEventHandler = async (tweet: TweetV2SingleResult) => {
    const bot = ctx.bots.get(config.botId);
    if (!bot) {
      LOGGER.warn(`botId ${config.botId} not found`);
      return;
    }

    let tweetType: "tweet" | "retweet" | "comment" = "tweet";
    if (tweet.data.in_reply_to_user_id) {
      tweetType = "comment";
    } else if (tweet.data.referenced_tweets && tweet.data.referenced_tweets[0].type == "retweeted") {
      tweetType = "retweet";
    }

    const username = tweet.includes.users[0].username;
    LOGGER.debug(`received ${tweetType} from ${username}`);

    const url = `https://twitter.com/${username}/status/${tweet.data.id}`;

    const groupConfigList = await ctx.mongoDatabase.getGroupConfigListByRegisteredUser(tweet.data.author_id);
    const subscribedList = groupConfigList.filter(groupConfig => groupConfig.userConfigMap[tweet.data.author_id][tweetType]);

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
        const userConfig = groupConfig.userConfigMap[tweet.data.author_id];
        const parsedNode = await parseScreenshotResult(screenshotResult.content, userConfig, ctx.baiduTranslate);
        const msg = getParsedText(parsedNode);
        const historyIndex = await ctx.mongoDatabase.addHistory(groupConfig.guildId, `${username}/status/${tweet.data.id}`);
        await bot.sendMessage(groupConfig.guildId, msg + `\n[INDEX]: ${historyIndex}`).catch(() => LOGGER.warn("send message error"));
      }
    }
  }

  const groupCtx = ctx.guild();

  ctx.on("ready", async () => {
    ctx.i18n.define("zh", require("./locales/zh"));

    ctx.twitterApiClient.stream
      .on(ETwitterStreamEvent.DataError, dataErrorEventHandler)
      .on(ETwitterStreamEvent.ConnectError, connectErrorEventHandler)
      .on(ETwitterStreamEvent.ReconnectError, reconnectErrorEventHandler)
      .on(ETwitterStreamEvent.ConnectionError, connectionErrorEventHandler)
      .on(ETwitterStreamEvent.TweetParseError, tweetParseErrorEventHandler)
      .on(ETwitterStreamEvent.Connected, connectedEventHandler)
      .on(ETwitterStreamEvent.ConnectionClosed, connectionClosedEventHandler)
      .on(ETwitterStreamEvent.ConnectionLost, connectionLostEventHandler)
      .on(ETwitterStreamEvent.Reconnected, reconnectedEventHandler)
      .on(ETwitterStreamEvent.ReconnectAttempt, reconnectAttemptEventHandler)
      .on(ETwitterStreamEvent.Data, dataEventHandler);

    const uidList = await ctx.mongoDatabase.getRegisteredUserIdList();
    LOGGER.debug(`establishing stream with user ids ${JSON.stringify(uidList)}`);

    await ctx.twitterApiClient.updateStreamRule(uidList);

    await ctx.twitterApiClient.stream.connect();

    LOGGER.debug("plugin start");
  });

  ctx.on("dispose", async () => {
    ctx.twitterApiClient.stream
      .removeListener(ETwitterStreamEvent.DataError, dataErrorEventHandler)
      .removeListener(ETwitterStreamEvent.ConnectError, connectErrorEventHandler)
      .removeListener(ETwitterStreamEvent.ReconnectError, reconnectErrorEventHandler)
      .removeListener(ETwitterStreamEvent.ConnectionError, connectionErrorEventHandler)
      .removeListener(ETwitterStreamEvent.TweetParseError, tweetParseErrorEventHandler)
      .removeListener(ETwitterStreamEvent.Connected, connectedEventHandler)
      .removeListener(ETwitterStreamEvent.ConnectionClosed, connectionClosedEventHandler)
      .removeListener(ETwitterStreamEvent.ConnectionLost, connectionLostEventHandler)
      .removeListener(ETwitterStreamEvent.Reconnected, reconnectedEventHandler)
      .removeListener(ETwitterStreamEvent.ReconnectAttempt, reconnectAttemptEventHandler)
      .removeListener(ETwitterStreamEvent.Data, dataEventHandler);

    LOGGER.debug("plugin end");
  });

  ctx.on("guild-deleted", async (session) => {
    await ctx.mongoDatabase.deleteGroupConfig(session.guildId);
    const uidList = await ctx.mongoDatabase.getRegisteredUserIdList();
    await ctx.twitterApiClient.updateStreamRule(uidList);
    LOGGER.debug(`establishing stream with user ids ${JSON.stringify(uidList)}`);
  });

  ctx.command("screenshot <url: string>")
    .alias("scr")
    .action(async (argv, url) => {
      LOGGER.debug(`screenshot command for ${url} start`);

      const gotoResult = await ctx.twitterScreenshotClient.goto(url);
      if (gotoResult.state == false) return gotoResult.content;
      await new Promise(resolve => setTimeout(resolve, 1000));
      const screenshotResult = await ctx.twitterScreenshotClient.screenshot(gotoResult.content);
      if (screenshotResult.state == false) return screenshotResult.content;

      const parsedNode = await parseScreenshotResult(screenshotResult.content, makeUserConfig("", ""), ctx.baiduTranslate);

      return getParsedText(parsedNode);
    });

  groupCtx.command("announce <content: text>", { hidden: true })
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

  groupCtx.command("translate <indexOrUrl: string>")
    .alias("tr")
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
      } else if (indexOrUrl.startsWith("https://")) {
        // is url
        LOGGER.debug(`translate for url ${indexOrUrl}`);
        url = indexOrUrl;

        // match for username
        const matchedUsername = url.match(/\w+(?=\/status)/gm);
        if (!matchedUsername) return "链接错误，无法匹配到<username>/status字段";
        const username = matchedUsername[0];

        const currentUserConfig = await ctx.mongoDatabase.getUserConfig(argv.session.guildId, undefined, username);

        // dummy config
        userConfig = currentUserConfig.state ? currentUserConfig.content : makeUserConfig("", "");
      } else {
        return "未知输入，请提供推文链接或序号";
      }

      // get user translation input
      await argv.session.send("请输入翻译内容");
      translation = segment.unescape(await argv.session.prompt());
      LOGGER.debug(`received user translation ${translation}`);
      if (translation == commandTerminator) return "命令终止";

      // add translation and take screenshot
      LOGGER.debug(`start taking screenshot ...`);
      const gotoResult = await ctx.twitterScreenshotClient.goto(url);
      if (gotoResult.state == false) return gotoResult.content;
      await ctx.twitterScreenshotClient.translate(gotoResult.content, translation, userConfig).catch(err => LOGGER.warn(err));
      await new Promise(resolve => setTimeout(resolve, 1000));
      const screenshotResult = await ctx.twitterScreenshotClient.screenshot(gotoResult.content);
      if (screenshotResult.state == false) return screenshotResult.content;

      LOGGER.debug(`take screenshot completed`);

      return segment("image", { url: "base64://" + screenshotResult.content.screenshotBase64 });
    });

  groupCtx.command("check <...usernameList>")
  .option("css", "")
  .option("tag", "")
  .option("background", "")
    .action(async (argv, ...usernameList) => {
      const groupConfig: IGroupConfig = await ctx.mongoDatabase.getGroupConfig(argv.session.guildId);
      const userConfigList: IUserConfig[] = [];
      let msgList: string[] = [];

      const contentKeyList: (typeof CustomizableUserConfigKeys[number])[] = [];

      if (argv.options.tag)        contentKeyList.push("tag");
      if (argv.options.background) contentKeyList.push("background");
      if (argv.options.css)        contentKeyList.push("css");

      for (const username of usernameList) {
        if (username == "*") {
          userConfigList.splice(0, userConfigList.length);
          userConfigList.push(...Object.values(groupConfig.userConfigMap));
          break;
        } else {
          const userConfig = Object.values(groupConfig.userConfigMap).find(userConfig => userConfig.username == username);
          userConfigList.push(userConfig);
        }
      }

      for (const [index, userConfig] of userConfigList.entries()) {
        if (!userConfig) {
          msgList.push(`用户${usernameList[index]}未找到`);
          continue;
        }
        if (contentKeyList.length) {
          const content: string[] = [];
          for (const key of contentKeyList) {
            if (!userConfig[key]) {
              content.push(`设置${key}不存在`);
              continue;
            }
            switch (key) {
              case "background":
              case "tag":
                const imageContent = await fs.promises.readFile(userConfig[key], { encoding: "base64" });
                content.push(`${key}: ${segment("image", { url: `base64://${imageContent}`})}`);
                break;
              case "css":
                const fileContent = await fs.promises.readFile(userConfig[key], { encoding: "utf-8" });
                content.push(`${key}: ${fileContent}`);
                break;
            }
          }
          msgList.push(`${userConfig.username}: ${content.join("\n")}`);
        } else {
          for (const key of CustomizableUserConfigKeys) delete userConfig[key];
          msgList.push(`${userConfig.username}: ${JSON.stringify(userConfig)}`);
        }
      }

      return msgList.join("\n");
    });

  groupCtx.command("set <username: string> <...keys>")
    .option("off", "")
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
          if (key == "css") {
            const defaultCSSTemplate = await fs.promises.readFile("./resources/defaultCSS.css", { encoding: "utf-8" });
            await argv.session.sendQueued(`默认css模板为：\n${defaultCSSTemplate}`);
          }
          await argv.session.sendQueued(`请输入设置${key}的内容`);
          const rawCustomContent = await argv.session.prompt();
          if (rawCustomContent == commandTerminator) return "命令终止";
          const result = segment.parse(rawCustomContent);
          if (result.length != 1) return `为设置${key}提供的参数数量错误，需求1，当前为${result.length}`;
          const content = result[0];

          const filenameGenerator = customAlphabet(alphanumeric, 10);
          const filename = await filenameGenerator();
          const suffix = key == "css" ? "css" : "png";
          const dir = `./resources/${argv.session.guildId}`;

          await fs.promises.mkdir(dir, { recursive: true });

          const filepath = `${dir}/${filename}.${suffix}`;
          if (key == "css" && content.type != "text" || key != "css" && content.type != "image")
            return `内容类型错误，需求${key == "css" ? "text" : "image"}， 当前为${content.type}`;

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

  groupCtx.command("user <...usernameList>")
    .option("add", "")
    .option("delete", "")
    .check(async (argv, ...usernameList) => {
      if (!argv.options.add && !argv.options.delete || argv.options.add && argv.options.delete)
        return "请提供且仅提供一个参数";
    })
    .action(async (argv, ...usernameList) => {
      const msgList: string[] = [];
      for (const username of usernameList) {
        const user = await ctx.twitterApiClient.client.userByUsername(username);
        if (user.errors) {
          msgList.push(`无法找到用户${username}, 错误：\n${user.errors}`);
          continue;
        }
        const result = argv.options.add ?
          await ctx.mongoDatabase.createUserConfig(argv.session.guildId, user.data.id, user.data.username) :
          await ctx.mongoDatabase.deleteUserConfig(argv.session.guildId, user.data.id, user.data.username);
        msgList.push(`${username}: ${result.content}`);
      }

      return msgList.join("\n");
    });
}
