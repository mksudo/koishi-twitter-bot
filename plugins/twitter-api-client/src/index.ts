import { Context, Logger, Schema, Service } from 'koishi';
import { TwitterApi, TwitterApiv2, TweetStream, TweetV2SingleStreamResult } from "twitter-api-v2";


declare module "koishi" {
  namespace Context {
    interface Services {
      twitterApiClient: TwitterApiClient,
    }
  }
}

export const name = 'twitterApiClient';

const LOGGER = new Logger(name);

/**
 * This class implements the interaction between twitter api and current bot
 */
class TwitterApiClient extends Service {
  client: TwitterApiv2;
  stream: TweetStream<TweetV2SingleStreamResult>;

  constructor(ctx: Context, public config: TwitterApiClient.Config) {
    super(ctx, name);
    // only use v2 api
    this.client = new TwitterApi(config.bearerToken).v2;
  }

  protected async start() {
    this.stream = this.stream || await this.client.searchStream({
      "tweet.fields": ["entities", "in_reply_to_user_id", "referenced_tweets"],
      "user.fields": ["id", "username"],
      "expansions": ["author_id"],
    });
    LOGGER.debug("service start");
  }

  protected async stop() {
    this.stream?.close();
    LOGGER.debug("service stop");
  }

  /**
   * Update twitter rules to follow all given twitter user
   * @param uidList array of twitter user id
   */
  async updateStreamRule(uidList: string[]) {
    const ruleList = [];

    let currRule = "";

    for (const uid of uidList) {
      if (currRule == "") {
        currRule = `from:${uid}`;
      }
      else {
        const nextRule = `${currRule} OR from:${uid}`;
        // twitter api restriction, single rule length must not be longer than 512 characters
        if (nextRule.length <= 512) {
          currRule = nextRule;
        }
        else {
          ruleList.push({ value: currRule });
          currRule = "";
        }
      }
    }

    ruleList.push({ value: currRule });

    // twitter api restriction, there cannot be more than 25 rules
    if (ruleList.length > 25) throw new Error("requires more rules than affordable, aborting");

    // clear every existing rules
    const currRuleList = await this.client.streamRules();
    if (currRuleList.data) {
      await this.client.updateStreamRules({
        delete: {
          ids: currRuleList.data.map(rule => rule.id),
        },
      });
    }

    await this.client.updateStreamRules({ add: ruleList });
  }
}

namespace TwitterApiClient {
  export interface Config {
    bearerToken: string,
  }

  export const schema: Schema<Config> = Schema.object({
    bearerToken: Schema.string().required().description("bearer token for twitter api v2"),
  });
}

export default TwitterApiClient;
