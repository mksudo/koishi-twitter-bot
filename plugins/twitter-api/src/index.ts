import { Context, Logger, Schema, Service } from "koishi";
import {
  ETwitterStreamEvent,
  TweetStream,
  TweetV2SingleStreamResult,
  TwitterApi as TwitterApiProvider,
} from "twitter-api-v2";
import {
  ITwitterUser,
  name as twitterDatabaseName,
} from "koishi-plugin-twitter-database";

export { ETwitterStreamEvent } from "twitter-api-v2";
export { TweetType } from "./models/tweetType";

declare module "koishi" {
  interface Context {
    twitterApi: TwitterApi;
  }
}

export const name = "twitterApi";

const logger = new Logger(name);
if (process.env.DEBUG) logger.level = 3;

/**
 * This class handles the twitter api connections for the whole project,
 * as a service, it will be injected into koishijs context
 * on startup
 */
class TwitterApi extends Service {
  static using = [twitterDatabaseName] as const;

  protected _twitterApi: TwitterApiProvider;
  public get twitterApi() {
    return this._twitterApi;
  }
  protected _twitterStream: TweetStream<TweetV2SingleStreamResult>;
  public get twitterStream() {
    return this._twitterStream;
  }
  protected _isDataHandlerRegistered: boolean;
  public get isDataHandlerRegistered() {
    return this._isDataHandlerRegistered;
  }
  public set isDataHandlerRegistered(isDataHandlerRegistered: boolean) {
    this.isDataHandlerRegistered = isDataHandlerRegistered;
  }

  constructor(ctx: Context, config: TwitterApi.Config) {
    super(ctx, name);

    // initialize the twitter api
    this._twitterApi = new TwitterApiProvider(config.bearerToken);
    this._isDataHandlerRegistered = false;
  }

  /**
   * This method is called when the service is starting
   * Do not instantiate the stream here because a 409 error
   * will be thrown out if thre is no rule present
   */
  protected async start() {
    logger.debug("service starting");

    logger.debug("service started, stream initialized");
  }

  /**
   * This method is called when the service is stopping
   */
  protected async stop() {
    logger.debug("service stopping");

    // close the stream if it is not already closed
    this._twitterStream?.close();
    this._twitterStream = undefined;

    logger.debug("service stopped");
  }

  /**
   * Create a stream
   */
  protected async makeStream() {
    this._twitterStream = await this._twitterApi.v2.searchStream({
      "tweet.fields": ["entities", "in_reply_to_user_id", "referenced_tweets"],
      "user.fields": ["id", "username"],
      expansions: ["author_id"],
    });

    this._twitterStream.autoReconnect = true;
    this._twitterStream.autoReconnectRetries = Infinity;

    Object.keys(ETwitterStreamEvent).forEach((eventName) => {
      this._twitterStream.on(eventName, (...payloads) => {
        logger.debug(
          `stream event ${eventName}, payloads: ${JSON.stringify(payloads)}`
        );
      });
    });
  }

  /**
   * Update the twitter official api stream rules
   * see https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/integrate/build-a-rule
   * @param users all registered twitter users
   */
  async updateStreamRules(users: ITwitterUser[]) {
    logger.debug(
      `registering rules for users ${JSON.stringify(
        users.map((user) => user.id)
      )}`
    );

    const userIdRules = users.map((user) => `from:${user.id}`);
    const rules = [];
    let currentRule = "";

    for (const userIdRule of userIdRules) {
      if (currentRule) {
        const nextRule = currentRule + ` OR ${userIdRule}`;
        if (nextRule.length > 512) {
          rules.push({ value: currentRule });
          currentRule = userIdRule;
        } else {
          currentRule = nextRule;
        }
      } else {
        currentRule = userIdRule;
      }
    }

    rules.push({ value: currentRule });

    if (rules.length > 25)
      throw new Error(
        `max rule amount: 25, current rule amount: ${rules.length}, cannot afford`
      );

    const currentRules = await this._twitterApi.v2.streamRules();

    if (currentRules.data) {
      await this._twitterApi.v2.updateStreamRules({
        delete: {
          ids: currentRules.data.map((rule) => rule.id),
        },
      });
    }

    await this._twitterApi.v2.updateStreamRules({ add: rules });

    if (this._twitterStream === undefined) {
      await this.makeStream();
    }
  }

  /**
   * Find twitter user info based on input id or name
   *
   * @param id twitter user id
   * @param name twitter user screen name
   *
   * @returns the twitter user found, undefined if none exists
   */
  async selectUser(id?: string, name?: string) {
    if (id) return await this._twitterApi.v2.user(id);
    else if (name) return await this._twitterApi.v2.userByUsername(name);
    else return undefined;
  }
}

namespace TwitterApi {
  export interface Config {
    bearerToken: string;
  }

  export const Config: Schema<Config> = Schema.object({
    bearerToken: Schema.string()
      .required()
      .description("bearer token for twitter api v2"),
  });
}

export default TwitterApi;
