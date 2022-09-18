import { Context, Logger, Query, Schema, Service } from "koishi";
import { ITwitterCustomized } from "./models/customized";
import { ITwitterHistory } from "./models/history";
import { ITwitterIdentifier } from "./models/identifier";
import { Modifier } from "./models/modifier";
import { ITwitterUser } from "./models/user";
import { existInDatabase } from "./utils/existInDatabase";
import { extendTwitterCustomized } from "./utils/extendTwitterCustomized";
import { extendTwitterHistory } from "./utils/extendTwitterHistory";
import { extendTwitterUser } from "./utils/extendTwitterUser";
import { logFunctionCall } from "./utils/logFunctionCall";

export { Modifier };
export * from "./models/user";
export * from "./models/history";
export * from "./models/customized";
export * from "./models/identifier";
export * from "./models/modifier";

declare module "koishi" {
  interface Tables {
    twitterUser: ITwitterUser;
    twitterHistory: ITwitterHistory;
    twitterCustomized: ITwitterCustomized;
  }
  interface Context {
    twitterDatabase: TwitterDatabase;
  }
}

export const name = "twitterDatabase";
export const using = ["database"] as const;

const logger = new Logger(name);
if (process.env.DEBUG) logger.level = 3;

/**
 * This class handles the database for the whole project,
 * as a service, it will be injected into koishijs context
 * on startup
 */
class TwitterDatabase extends Service {
  constructor(ctx: Context) {
    super(ctx, name);
  }

  /**
   * This method is called when the service is starting
   */
  protected async start() {
    extendTwitterUser(this.ctx);
    extendTwitterHistory(this.ctx);
    extendTwitterCustomized(this.ctx);
  }

  /**
   * Register a twitter user for a given group
   *
   * @param groupId the group id of the given group
   * @param id the twitter id of the twitter user
   * @param name the screen name of the twitter user
   *
   * @returns whether the twitter user is already registered or not
   */
  async registerUser(groupId: string, id: string, name: string) {
    logFunctionCall(logger, this.registerUser, groupId, id, name);

    const exists = await existInDatabase(this.ctx, "twitterUser", {
      registeredBy: groupId,
      id,
      name,
    });

    if (exists) return false;

    await this.ctx.database.create("twitterUser", {
      registeredBy: groupId,
      id,
      name,
    });

    return true;
  }

  /**
   * Unregister a twitter user for a given group
   *
   * @param groupId the group id of the given group
   * @param id the twitter id of the twitter user
   * @param name the screen name of the twitter user
   *
   * @returns whether the unregister process succeeds or not,
   * fails when the twitter user is not yet registered
   */
  async unregisterUser(groupId: string, id?: string, name?: string) {
    logFunctionCall(logger, this.unregisterUser, groupId, id, name);

    const query: Query<ITwitterUser> = id
      ? {
          registeredBy: groupId,
          id,
        }
      : {
          registeredBy: groupId,
          name,
        };

    const exists = await existInDatabase(this.ctx, "twitterUser", query);

    if (exists) {
      await this.ctx.database.remove("twitterUser", query);
      return true;
    }

    return false;
  }

  /**
   * Modify the setting of a twitter user based on the given modifier
   *
   * @param modifier modifier of the twitter user settings
   *
   * @returns whether the update succeeds or not,
   * fails when the twitter user is not yet registered
   */
  async modifyUser(modifier: Modifier<ITwitterUser>) {
    logFunctionCall(logger, this.modifyUser, modifier);

    const exists = await existInDatabase(this.ctx, "twitterUser", {
      registeredBy: modifier.registeredBy,
      id: modifier.id,
      name: modifier.name,
    });

    if (exists) {
      await this.ctx.database.upsert("twitterUser", [modifier]);
      return true;
    }
    return false;
  }

  /**
   * Get the setting for the given twitter user
   *
   * @param groupId the group id of the given group
   * @param id the twitter id of the twitter user
   * @param name the screen name of the twitter user
   *
   * @returns the twitter user setting stored in the database,
   * undefined if does not exist
   */
  async selectUser(
    groupId: string,
    id?: string,
    name?: string
  ): Promise<ITwitterUser | undefined> {
    logFunctionCall(logger, this.selectUser, groupId, id, name);

    const query: Query<ITwitterUser> = id
      ? {
          registeredBy: groupId,
          id,
        }
      : {
          registeredBy: groupId,
          name,
        };

    const userConfigs = await this.ctx.database
      .select("twitterUser", query)
      .execute();

    return userConfigs[0];
  }

  /**
   * Find all twitter users based on the input identifier
   *
   * @param identifier the query of identifier to be used to find all the twitter user settings
   *
   * @returns twitter users found according to the identifier, empty list if none is found
   */
  async selectUsers(identifier: Query<ITwitterIdentifier>) {
    logFunctionCall(logger, this.selectUsers, identifier);

    return await this.ctx.database.select("twitterUser", identifier).execute();
  }

  /**
   * Insert a new twitter history to the database
   *
   * @param groupId the group id of the given group
   * @param url the url of the twitter history
   *
   * @returns the inserted twitter history
   */
  async addHistory(groupId: string, url: string) {
    logFunctionCall(logger, this.addHistory, groupId, url);

    return await this.ctx.database.create("twitterHistory", {
      registeredBy: groupId,
      url,
    });
  }

  /**
   * Find the twitter history based on the provided index
   *
   * @param groupId the group id of the given group
   * @param index the index of the twitter history
   *
   * @returns the history found, undefined is none is found
   */
  async selectHistory(
    groupId: string,
    index: number
  ): Promise<ITwitterHistory | undefined> {
    logFunctionCall(logger, this.selectHistory, groupId, index);

    const result = await this.ctx.database
      .select("twitterHistory", { registeredBy: groupId, index })
      .execute();

    return result[0];
  }

  /**
   * Add a customized content to the database
   *
   * @param customized the customized contents to be added
   */
  async addCustomized(customized: ITwitterCustomized) {
    logFunctionCall(logger, this.addCustomized, customized);

    await this.ctx.database.upsert("twitterCustomized", [customized]);
  }

  /**
   * Modify the customized content based on the given modifier
   *
   * @param modifier modifier of the customized contents
   *
   * @returns whether the update succeeds, fails if the customized content is not yet registered
   */
  async modifyCustomized(modifier: Modifier<ITwitterCustomized>) {
    logFunctionCall(logger, this.modifyCustomized, modifier);

    const exists = await existInDatabase(this.ctx, "twitterCustomized", {
      registeredBy: modifier.registeredBy,
      id: modifier.id,
      name: modifier.name,
    });

    if (exists) {
      await this.ctx.database.upsert("twitterCustomized", [modifier]);
      return true;
    }
    return false;
  }

  /**
   * Find customized content based on the given information
   *
   * @param groupId the group id of the given group
   * @param id the twitter id of the twitter user
   * @param name the screen name of the twitter user
   *
   * @returns the customized content found, undefined if none is found
   */
  async selectCustomized(groupId: string, id?: string, name?: string) {
    logFunctionCall(logger, this.selectCustomized, groupId, id, name);

    const query: Query<ITwitterCustomized> = id
      ? {
          registeredBy: groupId,
          id,
        }
      : {
          registeredBy: groupId,
          name,
        };

    const result = await this.ctx.database
      .select("twitterCustomized", query)
      .execute();

    return result[0];
  }
}

namespace TwitterDatabase {
  export interface Config {}

  export const Config: Schema<Config> = Schema.object({});
}

export default TwitterDatabase;
