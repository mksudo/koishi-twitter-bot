import fs from 'fs';
import { Context, Logger, Schema, Service } from 'koishi';
import { Collection, MongoClient } from "mongodb";
import { IGroupConfig, MAX_HISTORY_LENGTH, UserConfigModifier } from './model';
import { err, makeGroupConfig, makeUserConfig, ok } from './utils';

export * from "./model";
export { makeGroupConfig, makeUserConfig } from './utils';

declare module "koishi" {
  namespace Context {
    interface Services {
      mongoDatabase: MongoDatabase,
    }
  }
}

export const name = 'mongoDatabase';

const LOGGER = new Logger(name);
LOGGER.level = 3;

/**
 * This class implements mongo database functionality required for twitter plugin
 */
class MongoDatabase extends Service {
  protected client: MongoClient;
  protected groupConfigCollection: Collection<IGroupConfig>;

  constructor(ctx: Context, public config: MongoDatabase.Config) {
    super(ctx, name);
    this.client = new MongoClient(config.databaseUrl);
  }

  protected async start() {
    // create custom resource folder if necessary
    await fs.promises.access("./resources").catch(() => fs.promises.mkdir("./resources"));
    await this.client.connect();
    this.groupConfigCollection = this.client.db("bot").collection("groupconfig");
    LOGGER.debug("database connected");
  }

  protected async stop() {
    this.groupConfigCollection = undefined;
    await this.client?.close().catch(LOGGER.warn);
    LOGGER.debug("database disconnected")
  }

  /**
   * Create a new group config for the group and insert to database
   * @param guildId id of group
   * @returns the created group config object
   */
  protected async createGroupConfig(guildId: string) {
    LOGGER.debug(`insert group config for ${guildId}`);

    const groupConfig = makeGroupConfig(guildId);
    await this.groupConfigCollection.insertOne(groupConfig);
    return groupConfig;
  }

  /**
   * Get the group config of current group
   * @param guildId id of group
   * @returns group config object, will create a new one if not found
   */
  async getGroupConfig(guildId: string) {
    return await this.groupConfigCollection.findOne<IGroupConfig>({ guildId }, { projection: { _id: 0 } }) || await this.createGroupConfig(guildId);
  }

  /**
   * Get all group configs registered and return them in an array
   * @returns array of all group configs
   */
  async getAllGroupConfig() {
    return await this.groupConfigCollection.find<IGroupConfig>({}, { projection: { _id: 0 } }).toArray();
  }

  /**
   * Delete the group config for curretn group
   * @param guildId id of group
   */
  async deleteGroupConfig(guildId: string) {
    await this.groupConfigCollection.deleteOne({ guildId });
  }

  /**
   * Try to find the user config registered for current group
   * @param guildId id of grup
   * @param userid userid of twitter user
   * @param username username of twitter user
   * @returns user config object if found or error message if failed
   */
  async getUserConfig(guildId: string, userid?: string, username?: string) {
    const groupConfig = await this.getGroupConfig(guildId);
    if (userid) {
      return userid in groupConfig.userConfigMap ? ok(groupConfig.userConfigMap[userid]) : err(`无法找到用户${userid}`);
    } else if (username) {
      const userConfig = Object.values(groupConfig.userConfigMap).find(userConfig => userConfig.username == username);
      return userConfig ? ok(userConfig) : err(`无法找到用户${username}`);
    } else {
      return err("请至少提供userid和username中的一个");
    }
  }

  /**
   * Find all group configs that are registered for twitter user
   * @param userid userid of twitter user
   * @returns array of group configs that are registered for twitter user
   */
  async getGroupConfigListByRegisteredUser(userid: string) {
    return await this.groupConfigCollection.find<IGroupConfig>({ [`userConfigMap.${userid}`]: { $exists: true } }, { projection: { _id: 0 }}).toArray();
  }

  /**
   * Try to register twitter user for current group
   * @param guildId id of group
   * @param userid userid of twitter user
   * @param username username of twitter user
   * @returns ok message or error message
   */
  async createUserConfig(guildId: string, userid: string, username: string) {
    if ((await this.getUserConfig(guildId, userid)).state) {
      return err(`用户${username}已被注册，无法再次注册`);
    }
    const userConfig = makeUserConfig(userid, username);
    await this.groupConfigCollection.findOneAndUpdate({ guildId }, { $set: { [`userConfigMap.${userid}`]: userConfig } });
    return ok(`用户${username}注册完毕`);
  }

  /**
   * Try to unregister twitter user for current group
   * @param guildId id of group
   * @param userid userid of twitter user
   * @param username username of twitter user
   * @returns ok message or error message
   */
  async deleteUserConfig(guildId: string, userid: string, username: string) {
    if ((await this.getUserConfig(guildId, userid, username)).state) {
      await this.groupConfigCollection.findOneAndUpdate({ guildId }, { $unset: { [`userConfigMap.${userid}`]: "" } });
      return ok(`用户${username}取消注册完毕`);
    }
    return err(`用户${username}尚未被注册，无法取消注册`);
  }

  /**
   * Try to modify the config of twitter user for current group
   * @param guildId id of group
   * @param modifier user config modifier object
   * @param userid userid of twitter user
   * @param username username of twitter user
   * @returns ok message or error message
   */
  async modifyUserConfig(guildId: string, modifier: UserConfigModifier, userid?: string, username?: string) {
    if ((await this.getUserConfig(guildId, userid, username)).state) {
      const modifyMap = {};
      for (const [key, value] of Object.entries(modifier)) {
        modifyMap[`userConfigMap.${userid}.${key}`] = value;
      }
      await this.groupConfigCollection.findOneAndUpdate({ guildId }, { $set: modifyMap });
      return ok(`用户${username || userid}的设置已更改`);
    }
    return err(`用户${username || userid}尚未被注册，无法更改设置`);
  }

  /**
   * Insert the given history to current group
   * @param guildId id of group
   * @param history history twitter url
   * @returns the natural index of inserted twitter url
   */
  async addHistory(guildId: string, history: string) {
    const groupConfig = await this.getGroupConfig(guildId);
    // empty half of the array if too long
    const sliceNumber = groupConfig.historyList.push(history) > MAX_HISTORY_LENGTH ? -MAX_HISTORY_LENGTH / 2 - 1 : -MAX_HISTORY_LENGTH;
    await this.groupConfigCollection.findOneAndUpdate({ guildId }, {
      $inc: {
        currentIndex: 1,
      },
      $push: {
        historyList: {
          $each: [history],
          $slice: sliceNumber,
        }
      }
    });
    return groupConfig.currentIndex + 1;
  }

  /**
   * Try to get the required history from database
   * @param guildId id of group
   * @param historyIndex natural index of history
   * @returns ok required history or err messgae
   */
  async getHistory(guildId: string, historyIndex: number) {
    const groupConfig = await this.getGroupConfig(guildId);
    const realIndex = groupConfig.historyList.length - (groupConfig.currentIndex - historyIndex) - 1;
    if (realIndex < 0 || realIndex > groupConfig.historyList.length - 1) {
      return err(`序号超出范围${1}-${groupConfig.historyList.length}`);
    }
    return ok(groupConfig.historyList[realIndex]);
  }

  /**
   * Get all registered twitter user id
   * @returns array of distinct registered twitter user id
   */
  async getRegisteredUserIdList() {
    const useridList: string[] = [];
    const groupConfigList = await this.groupConfigCollection.find().toArray();
    groupConfigList.forEach(groupConfig => {
      // TODO: unknown issue that cause key to become negative string
      useridList.push(...Object.values(groupConfig.userConfigMap).map(userConfig => userConfig.userid));
    });
    return [...new Set(useridList)];
  }
}

namespace MongoDatabase {
  export interface Config {
    databaseUrl: string,
  }

  export const schema: Schema<Config> = Schema.object({
    databaseUrl: Schema.string().required().description("url to mongodb database"),
  });
}

export default MongoDatabase;
