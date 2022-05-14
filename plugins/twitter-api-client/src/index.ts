import { Context, Logger, Schema, Service } from 'koishi';
import { TwitterApi, TwitterApiv1, TweetStream, TweetV1 } from "twitter-api-v2";


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
  api: TwitterApi;
  client: TwitterApiv1;
  stream: TweetStream<TweetV1>;
  followers: string[];

  constructor(ctx: Context, public config: TwitterApiClient.Config) {
    super(ctx, name);
    this.api = new TwitterApi({
      appKey: this.config.consumerKey,
      appSecret: this.config.consumerSecret,
      accessToken: this.config.accessToken,
      accessSecret: this.config.accessSecret,
    });
    this.followers = [];
  }

  protected async start() {
    // this.stream = this.stream || await this.client.searchStream({
    //   "tweet.fields": ["entities", "in_reply_to_user_id", "referenced_tweets"],
    //   "user.fields": ["id", "username"],
    //   "expansions": ["author_id"],
    // });

    // switch to v1

    LOGGER.debug("service starting");
    this.client = this.api.v1;

    LOGGER.debug("service start");
  }

  protected async stop() {
    this.stream?.close();
    LOGGER.debug("service stop");
  }

  async updateFollowers(useridList: string[]) {
    this.stream?.close();
    this.followers = useridList;
    this.stream = await this.client.filterStream({
      follow: this.followers,
    });
    await this.stream.connect();
  }
}

namespace TwitterApiClient {
  export interface Config {
    bearerToken: string,
    accessToken: string,
    accessSecret: string,
    consumerKey: string,
    consumerSecret: string,
  }

  export const schema: Schema<Config> = Schema.object({
    bearerToken: Schema.string().required().description("bearer token for twitter api v2"),
    accessToken: Schema.string().required().description("accessToken for twitter api v1"),
    accessSecret: Schema.string().required().description("accessSecret for twitter api v1"),
    consumerKey: Schema.string().required().description("consumerKey for twitter api v1"),
    consumerSecret: Schema.string().required().description("consumerSecret for twitter api v1"),
  });
}

export default TwitterApiClient;
