import { TwitterApi, TwitterApiv2, TweetStream, TweetV2SingleStreamResult } from "twitter-api-v2";

/**
 * This is the class that handles the twitter v2 api, including the stream and the client
 *
 */
export class TwitterApiClient {
  client: TwitterApiv2;
  stream: TweetStream<TweetV2SingleStreamResult>;

  constructor(protected bearerToken) {
    this.client = (new TwitterApi(bearerToken)).v2;
  }

  /**
   * Create a stream if not initialized
   */
  async createStream() {
    if (this.stream) return;

    this.stream = await this.client.searchStream({
      "tweet.fields": ["entities", "in_reply_to_user_id", "referenced_tweets"],
      "user.fields": ["id", "username"],
      "expansions": ["author_id"]
    });
  }

  /**
   * Initalize everything when plugin is loaded
   */
  async load() {
    if (!(this.stream)) await this.createStream();
  }

  /**
   * Properly close everything when plugin is disposed
   */
  async unload() {
    if (this.stream) {
      this.stream.close();
    }
  }

  /**
   * Update current searchStream rule to start follow given users
   * @param uidList list of uids of following twitter users
   * @throws Error when too much user to be handled
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
