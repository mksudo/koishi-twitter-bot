import fs from "fs";
import { Context, Schema, segment } from 'koishi'
import { ETwitterStreamEvent, UserV2Result } from 'twitter-api-v2';
import { alphanumerical } from "nanoid-dictionary";
import { customAlphabet } from "nanoid/async";
import { CustomizableUserConfigKeys, IGroupConfig, IUserConfig, MongoDatabase, SwitchableUserConfigKeys, UserConfigModifier } from './mongodatabase';
import { makeUserConfig } from './mongodatabase/utils';
import { PuppeteerClient } from './puppeteer';
import { TwitterApiClient } from './twitter-api';
import { parseScreenshotResultToSegments, saveToFile } from './utils';
import { Result } from "./model";

export const name = 'twitter';

interface TwitterConfig {
  // twitter api v2 verification requirement
  bearerToken: string,
  // mongo db database url
  databaseUrl: string,
  // current cqhttp bot id
  botid: string,
  // executable path for the browser instance
  executablePath: string,
  // twitter user name
  twitterUserName: string,
  // twitter password
  twitterPassword: string,
  // phone number is for twitter loginverification purpose
  twitterPhoneNumber: string,
}

export const schema: Schema<TwitterConfig> = Schema.object({
  bearerToken: Schema.string().required().description("bearer token for twitter api v2"),
  databaseUrl: Schema.string().required().description("url to mongodb database"),
  botid: Schema.string().required().description("id of bot"),
  executablePath: Schema.string().required().description("executable path for chrome"),
  twitterUserName: Schema.string().required().description("user name of twitter account"),
  twitterPassword: Schema.string().required().description("password for twitter account"),
  twitterPhoneNumber: Schema.string().required().description("phone number for twitter account"),
})

export function apply(ctx: Context, config: TwitterConfig) {
  // only select context with guildId
  const groupContext = ctx.guild();
  // write your plugin here
  const logger = ctx.logger(name);
  const mongoDatabase = new MongoDatabase(config.databaseUrl, logger);
  const puppeteerClient = new PuppeteerClient(
    {
      product: "chrome",
      executablePath: config.executablePath,
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    }, {
    username: config.twitterUserName,
    password: config.twitterPassword,
    phone: config.twitterPhoneNumber,
  }, logger);
  const twitterClient = new TwitterApiClient(config.bearerToken);

  // register plugin ready callback
  ctx.on("ready", async () => {
    logger.debug("plugin loading")

    await mongoDatabase.load();
    await puppeteerClient.load();
    await twitterClient.load();

    logger.debug("plugin loaded");

    const useridList = await mongoDatabase.getRegisteredUserIdList();
    logger.debug(`plugin registering user id list ${useridList}`);

    await twitterClient.updateStreamRule([...useridList]);

    twitterClient.stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      logger.debug("received tweet");

      let tweetType: "tweet" | "retweet" | "comment" = "tweet";
      if (tweet.data.in_reply_to_user_id) {
        tweetType = "comment";
      } else if (tweet.data.referenced_tweets && tweet.data.referenced_tweets[0].type == "retweeted") {
        tweetType = "retweet";
      }

      const username = tweet.includes.users[0].username;

      const url = `https://twitter.com/${username}/status/${tweet.data.id}`;

      const page = await puppeteerClient.getPage();

      logger.debug(`start calling puppeteer client for current tweet url ${url}`);
      await puppeteerClient.preparePage(page, url);

      const screenshotResult = await puppeteerClient.screenshot(page);

      const groupConfigList = await mongoDatabase.getGroupConfigListByRegisteredUser(tweet.data.author_id);

      logger.debug(`start sending tweet to registered groups`);
      for (const groupConfig of groupConfigList) {
        const userConfig = groupConfig.userConfigMap[tweet.data.author_id];
        if (userConfig[tweetType]) {
          const msg = await parseScreenshotResultToSegments(screenshotResult, userConfig);
          await ctx.bots.get(config.botid).sendMessage(groupConfig.guildId, msg);
        }
      }
    });

    await twitterClient.stream.connect();

    logger.debug("plugin loaded");
  });

  ctx.on("dispose", async () => {
    logger.debug("plugin disposing");
    // clear registered stream listener to avoid duplicated listeners
    twitterClient.stream.removeAllListeners(ETwitterStreamEvent.Data);

    await puppeteerClient.unload();
    await mongoDatabase.unload();
    await twitterClient.unload();
    logger.debug("plugin disposed");
  });

  ctx.command("screenshot <url: string>", "take screenshot for a tweet")
    .alias("scr")
    .example("scr https://twitter.com/Twitter/status/1509206476874784769")
    .action(async (argv, url) => {
      logger.debug(`screenshot command triggered for url ${url}`);

      const page = await puppeteerClient.getPage();
      await puppeteerClient.preparePage(page, url);
      const screenshotResult = await puppeteerClient.screenshot(page);

      logger.debug("screenshot finished");

      return segment("image", { url: "base64://" + screenshotResult.screenshotBase64 });
    });

  groupContext.command("translate <indexOrUrl: string>", "translate a tweet with provided translation")
    .alias("tr")
    .example("tr https://twitter.com/Twitter/status/1509206476874784769 or tr 123")
    .action(async (argv, indexOrUrl) => {
      logger.debug("translate command triggered");

      let url: string;
      let translation: string;
      let userConfig: IUserConfig;

      if (parseInt(indexOrUrl).toString() == indexOrUrl) {
        // is index
        logger.debug(`translate for history index ${indexOrUrl}`);

        const historyResult = await mongoDatabase.getHistory(argv.session.guildId, parseInt(indexOrUrl));

        if (historyResult.status == false) return historyResult.content;

        url = historyResult.content;
        const userName = url.substring(0, url.indexOf("/"));

        const userConfigResult = await mongoDatabase.getUserConfig(argv.session.guildId, undefined, userName);

        if (userConfigResult.status == false) return userConfigResult.content;

        userConfig = userConfigResult.content;
      } else if (indexOrUrl.startsWith("https://twitter.com/")) {
        // is url
        logger.debug(`translate for url ${indexOrUrl}`);
        url = indexOrUrl;

        // dummy config
        userConfig = makeUserConfig("", "");
      } else {
        return "unknown input, please input url or index number";
      }

      // get user translation input
      await argv.session.send("please input your translation");
      translation = await argv.session.prompt();
      logger.debug(`received user translation ${translation}`);

      // add translation and take screenshot
      logger.debug(`start taking screenshot ...`);
      const page = await puppeteerClient.getPage();
      await puppeteerClient.preparePage(page, url);
      await puppeteerClient.translate(page, translation, userConfig);
      const screenshotResult = await puppeteerClient.screenshot(page);
      logger.debug(`take screenshot completed`);

      return segment("image", { url: "base64://" + screenshotResult.screenshotBase64 });
    });

  groupContext.command("check <username: string>")
    .example("check mkZH0740")
    .action(async (argv, username) => {
      const groupConfig = await mongoDatabase.getGroupConfig(argv.session.guildId);
      const userConfigList: IUserConfig[] = [];

      if (username == "*") {
        const groupConfig = await mongoDatabase.getGroupConfig(argv.session.guildId);
        userConfigList.push(...Object.values(groupConfig.userConfigMap));
      } else {
        const userConfigResult = await mongoDatabase.getUserConfig(argv.session.guildId, undefined, username);
        if (userConfigResult.status == false) return userConfigResult.content;

        userConfigList.push(userConfigResult.content);
      }

      const msgList: string[] = [];
      for (const userConfig of userConfigList) {
        msgList.push(JSON.stringify(userConfig));
      }

      return msgList.join("\n");
    })

  groupContext.command("set <username: string> <...keys>", "set user config for current group")
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
      logger.debug(`seting ${keys.join()} for user ${username} and group ${argv.session.guildId}`);
      const userConfigList: IUserConfig[] = [];

      if (username == "*") {
        const groupConfig = await mongoDatabase.getGroupConfig(argv.session.guildId);
        userConfigList.push(...Object.values(groupConfig.userConfigMap));
      } else {
        const userConfigResult = await mongoDatabase.getUserConfig(argv.session.guildId, undefined, username);
        if (userConfigResult.status == false) return userConfigResult.content;

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

          const filename = await customAlphabet(alphanumerical, 10);
          const suffix = key == "css" ? "txt" : "png";
          const dir = `./resources/${argv.session.guildId}`;

          await fs.promises.mkdir(dir, { recursive: true });

          const filepath = `${dir}/${filename}.${suffix}`;
          if (key == "css" && content.type != "text" || key != "css" && content.type != "image") return "invalid content supplied";

          await saveToFile(content, filepath).catch((err) => {
            logger.warn(`${err}`);
            return argv.session.sendQueued(`${err}`);
          });

          modifier[key] = filepath;
        }

        const msgList: string[] = [];
        for (const userConfig of userConfigList) {
          const result = await mongoDatabase.modifyUserConfig(argv.session.guildId, modifier, userConfig.userid);
          msgList.push(result.content);
        }

        return msgList.join("\n");
      }
    });

  groupContext.command("user [username: string]")
    .option("add", "-add")
    .option("delete", "-delete")
    .example(`user -add mkZH0740`)
    .action(async (argv, username) => {
      if (username) {
        const user: UserV2Result = await twitterClient.client.userByUsername(username);
        if (user.errors) return `error while finding user, ${user.errors}`;
        if (argv.options.add) {
          const result = await mongoDatabase.registerUserConfig(argv.session.guildId, user.data.id, user.data.username);
          if (result.status == true) {
            const userIdList = await mongoDatabase.getRegisteredUserIdList();
            await twitterClient.updateStreamRule([...userIdList]);
          }
          return result.content;
        } else if (argv.options.delete) {
          const result = await mongoDatabase.unregisterUserConfig(argv.session.guildId, user.data.id, user.data.username);
          if (result.status == true) {
            const userIdList = await mongoDatabase.getRegisteredUserIdList();
            await twitterClient.updateStreamRule([...userIdList]);
          }
          return result.content;
        } else {
          const userConfig = await mongoDatabase.getUserConfig(argv.session.guildId, user.data.id);
          if (userConfig.status == false) {
            return userConfig.content;
          }
          return `config for ${username} is ${JSON.stringify(userConfig.content)}`;
        }
      } else {
        const groupConfig: IGroupConfig = await mongoDatabase.getGroupConfig(argv.session.guildId);
        return `user registered: ${Object.keys(groupConfig.userConfigMap).join()}`;
      }
    })
}
