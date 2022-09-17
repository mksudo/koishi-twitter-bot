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

class TwitterDatabase extends Service {
  constructor(ctx: Context) {
    super(ctx, name);
  }

  protected async start() {
    extendTwitterUser(this.ctx);
    extendTwitterHistory(this.ctx);
    extendTwitterCustomized(this.ctx);
  }

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

  async selectUser(groupId: string, id?: string, name?: string) {
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

  async selectUsers(identifier: Query<ITwitterIdentifier>) {
    logFunctionCall(logger, this.selectUsers, identifier);

    return await this.ctx.database.select("twitterUser", identifier).execute();
  }

  async addHistory(groupId: string, url: string) {
    logFunctionCall(logger, this.addHistory, groupId, url);

    return await this.ctx.database.create("twitterHistory", {
      registeredBy: groupId,
      url,
    });
  }

  async selectHistory(groupId: string, index: number) {
    logFunctionCall(logger, this.selectHistory, groupId, index);

    const result = await this.ctx.database
      .select("twitterHistory", { registeredBy: groupId, index })
      .execute();

    return result[0];
  }

  async addCustomized(customized: ITwitterCustomized) {
    logFunctionCall(logger, this.addCustomized, customized);

    await this.ctx.database.upsert("twitterCustomized", [customized]);
  }

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

export * from "./models/user";
export * from "./models/history";
export * from "./models/customized";
export * from "./models/identifier";
export * from "./models/modifier";
