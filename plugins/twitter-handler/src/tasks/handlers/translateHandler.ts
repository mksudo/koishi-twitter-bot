import { access, mkdir, writeFile } from "fs/promises";
import { ITaskContext } from "../../models/taskContext";
import { addBackground } from "../../utils/addTranslation/addCustomizedElements/addBackground";
import { addCSS } from "../../utils/addTranslation/addCustomizedElements/addCSS";
import { addTag } from "../../utils/addTranslation/addCustomizedElements/addTag";
import { addTranslation } from "../../utils/addTranslation/addTranslation";
import { getTweets } from "../../utils/getTweets";
import { isTweetDetailRequest } from "../../utils/isTweetDetailRequest";
import { sendRequestForTweetDetail } from "../../utils/sendRequestForTweetDetail";
import { setNotSensitive } from "../../utils/setNotSensitive";
import { TaskHandler } from "../handler";

/**
 * This class handles the translate task, add translation to the tweets
 */
export class TranslateHandler extends TaskHandler {
  protected readonly hasPreHandle: boolean = true;

  /**
   * Hijack the tweet loading process to add translation and extract data
   * @param taskContext the shared task context
   */
  async preHandle(taskContext: ITaskContext) {
    this.preHandleLogger.debug("entered");

    taskContext.page.on("request", async (request) => {
      if (!isTweetDetailRequest(request.url())) return request.continue();

      if (request.method() !== "GET") return request.continue();

      this.preHandleLogger.debug("request intercepted");

      const result = await sendRequestForTweetDetail(
        request,
        await taskContext.page.cookies()
      );

      this.preHandleLogger.debug("response received");

      if (result === undefined) {
        this.preHandleLogger.debug(
          "response is undefined for some reason, aborting"
        );

        taskContext.screenshotContext.count = -1;
        taskContext.screenshotContext.tweets = [];

        return request.abort("failed");
      }

      this.preHandleLogger.debug("response status is " + result.statusText);

      try {
        const tweets = getTweets(result.data);

        tweets.forEach((tweet) => setNotSensitive(tweet));

        this.preHandleLogger.debug("response data parsed");

        taskContext.screenshotContext.tweets = tweets;
        taskContext.screenshotContext.count = tweets.length;
        taskContext.translateContext.majorTweetIndex = tweets.length - 1;

        this.preHandleLogger.debug("adding translation");

        for (const translation of taskContext.translateContext.translations) {
          const tweet = tweets[translation.index];
          if (tweet && tweet.__typename === "Tweet") {
            this.preHandleLogger.debug(
              `adding translation for tweet ${translation.index} with content ${translation.translation}`
            );

            const isMajorTweet = translation.index === tweets.length - 1;

            addTranslation(tweet, translation, isMajorTweet);

            this.preHandleLogger.debug("translation added");
          }
        }

        const tweetId = taskContext.screenshotContext.url.substring(
          taskContext.screenshotContext.url.lastIndexOf("/") + 1
        );

        writeFile(
          `./logs/translate/${tweetId}.json`,
          JSON.stringify(result.data, undefined, 2)
        );
      } catch (err) {
        const tweetId = taskContext.screenshotContext.url.substring(
          taskContext.screenshotContext.url.lastIndexOf("/") + 1
        );

        const failureFilePath = `./logs/failure/translate-${tweetId}.txt`;

        this.preHandleLogger.warn(
          `response data parsing failed, check file ${failureFilePath}`
        );

        await access("./logs/failure").catch(() => mkdir("./logs/failure"));

        writeFile(
          failureFilePath,
          JSON.stringify(result.data, undefined, 2) + `\n\n${err}`
        ).catch(() =>
          this.preHandleLogger.warn(`writing to file ${failureFilePath} failed`)
        );
      }

      this.preHandleLogger.debug("response sent");

      await request.respond({
        status: result.status,
        headers: result.headers,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(result.data),
      });
    });
  }

  /**
   * Add customized contents to the web page
   * @param taskContext the shared task context
   */
  async handle(taskContext: ITaskContext) {
    this.handleLogger.debug("entered");

    this.handleLogger.debug("adding tag");
    await addTag(taskContext, this.handleLogger);
    this.handleLogger.debug("adding background");
    await addBackground(taskContext, this.handleLogger);
    this.handleLogger.debug("adding css");
    await addCSS(taskContext, this.handleLogger);

    // await removeUnmodifiedTranslationSeperator(taskContext);

    this.handleLogger.debug("exited");
  }
}
