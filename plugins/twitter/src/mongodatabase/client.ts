import { Logger } from "koishi";
import { Collection, MongoClient } from "mongodb";
import { err, ok } from "../model";
import { IGroupConfig, IUserConfig, MAX_HISTORY_LENGTH, UserConfigModifier } from "./model";
import { makeGroupConfig, makeUserConfig } from "./utils";


/**
 * The class that handles the database connection
 */
export class MongoDatabase {
  protected client: MongoClient;
  protected groupConfigCollection: Collection<IGroupConfig>;

  constructor(private databaseUrl: string, private logger: Logger) {
    this.client = new MongoClient(this.databaseUrl);
  }

  /**
   * Properly load everything
   */
  async load() {
    await this.client.connect();
    this.groupConfigCollection = this.client.db("bot").collection("groupconfigs");
    this.logger.debug("connected to database");
  }

  /**
   * Properly free everything
   */
  async unload() {
    this.groupConfigCollection = undefined;
    await this.client.close();
    this.logger.debug("database freed");
  }

  /**
   * Insert an empty group config to the database
   * @param guildId the group id
   * @returns the inserted group config
   */
  protected async insertGroupConfig(guildId: string) {
    this.logger.debug(`insert default group config for group ${guildId}`);
    const groupConfig = makeGroupConfig(guildId);
    await this.groupConfigCollection.insertOne(groupConfig);
    return groupConfig;
  }

  /**
   * Get the group config corresponding to the current group, will create and insert an empty config if no config exist
   * @param guildId the group id
   * @returns the group config of current group, create empty if not exist
   */
  async getGroupConfig(guildId: string): Promise<IGroupConfig> {
    // remove _id from result
    const groupConfig = await this.groupConfigCollection.findOne<IGroupConfig>({ guildId }, { projection: { _id: 0 } });
    // if groupConfig is not truthy, then insert an empty config and return it
    return groupConfig || await this.insertGroupConfig(guildId);
  }

  /**
   * Get the user config registered in the group config, returns results of user config or error message
   * @param guildId the group id for the curretn group asking for user config
   * @param userid userid of the registered twitter user
   * @param username username of the registered twitter user
   * @returns true result containing the user config, or false result containing the error message
   */
  async getUserConfig(guildId: string, userid?: string, username?: string) {
    const groupConfig = await this.getGroupConfig(guildId);
    let userConfig: IUserConfig = undefined;
    if (userid && userid in groupConfig.userConfigMap) {
      // use userid
      userConfig = groupConfig.userConfigMap[userid];
    } else if (username) {
      // user username
      userConfig = Object.values(groupConfig.userConfigMap).find(userConfig => userConfig.username == username);
    } else {
      // both undefined, invalid usage
      return err("please supply at least one of userid and username");
    }

    return userConfig ? ok(userConfig) : err(`cannot find user ${username || userid}`);
  }

  /**
   * Register a twitter user for the current group
   * @param guildId the group id
   * @param userid userid for twitter user
   * @param username username for twitter user
   * @returns ok or err result depending on the current registration state
   */
  async registerUserConfig(guildId: string, userid: string, username: string) {
    if ((await this.getUserConfig(guildId, userid, username)).status == true) {
      return err(`user ${username} is already registered`);
    } else {
      const userConfig = makeUserConfig(userid, username);
      await this.groupConfigCollection.findOneAndUpdate({ guildId }, { $set: { [`userConfigMap.${userid}`]: userConfig }});
      return ok(`user ${username} is registered`);
    }
  }

  /**
   * Unregister a twitter user for the current group
   * @param guildId the group id
   * @param userid userid for twitter user
   * @param username username for twitter user
   * @returns ok or err result depending on the current registration state
   */
  async unregisterUserConfig(guildId: string, userid: string, username: string) {
    if ((await this.getUserConfig(guildId, userid, username)).status == true) {
      await this.groupConfigCollection.findOneAndUpdate({ guildId }, { $unset: { [`userConfigMap.${userid}`]: "" }});
      return ok(`user ${username} is unregistered`);
    } else {
      return err(`user ${username} is not registered`);
    }
  }

  /**
   * Modify the configs for a registered user
   * @param guildId the group id
   * @param modifier the modifier for the current user config, should be preverified so all keys are valid
   * @param userid user id for twitter user
   * @param username user name for twitter user
   * @returns ok or err result depending on the modify result
   */
  async modifyUserConfig(guildId: string, modifier: UserConfigModifier, userid?: string, username?: string) {
    if ((await this.getUserConfig(guildId, userid, username)).status == true) {
      await this.groupConfigCollection.findOneAndUpdate({ guildId }, { $set: { [`userConfigMap.${userid}`]: modifier }});
      return ok(`user config for user ${username || userid} is modified`);
    }
    return err(`user ${username || userid} is not registered`);
  }

  /**
   * Add current history for the group
   * @param guildId the group id
   * @param history the history to be added
   * @returns current index of the inserted history
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
   * Get a history from the current group config depending on the provided index
   * @param guildId the group id
   * @param historyIndex the index of the requested history, starting from 1
   * @returns ok or err result depending on the existence of the requested history
   */
  async getHistory(guildId: string, historyIndex: number) {
    const groupConfig = await this.getGroupConfig(guildId);
    const realIndex = groupConfig.historyList.length - (groupConfig.currentIndex - historyIndex) - 1;
    if (realIndex < 0 || realIndex > groupConfig.historyList.length - 1) {
      return err(`index out of range`);
    } else {
      return ok(groupConfig.historyList[realIndex]);
    }
  }

  /**
   * Get all nonduplicate registered twitter user ids
   * @returns a set of currently registered user id
   */
  async getRegisteredUserIdList() {
    const useridList = [];
    const groupConfigList = await this.groupConfigCollection.find().toArray();
    groupConfigList.forEach(groupConfig => {
      useridList.push(...Object.keys(groupConfig.userConfigMap));
    });
    return new Set(useridList);
  }

  /**
   * Get all groups that registered for the current user
   * @param userid user id of the twitter user
   * @returns array of group configs that registered the current user
   */
  async getGroupConfigListByRegisteredUser(userid: string) {
    const result = await this.groupConfigCollection.find<IGroupConfig>({ [`userConfigMap.${userid}`]: { $exists: true } }, { projection: { _id: 0 }});
    return await result.toArray();
  }
}
