import { access, mkdir, writeFile } from "fs/promises";
import { Logger } from "koishi";
import { ScreenshotClip } from "puppeteer-core";
import { ITaskContext } from "../../models/taskContext";
import { getTweets } from "../../utils/getTweets";
import { isTweetDetailRequest } from "../../utils/isTweetDetailRequest";
import { sendRequestForTweetDetail } from "../../utils/sendRequestForTweetDetail";
import { setNotSensitive } from "../../utils/setNotSensitive";
import { TaskHandler } from "../handler";

/**
 * This class handles screenshot tasks, take screenshot of the tweet
 * and extracts tweet data from loading process
 */
export class ScreenshotHandler extends TaskHandler {
  protected hasPreHandle: boolean = true;

  /**
   * Register web page request interceptor, hijack the loading request
   * to extract tweet data
   * @param taskContext the shared task context
   */
  async preHandle(taskContext: ITaskContext) {
    this.preHandleLogger.debug("entered");

    if (taskContext.translateContext) {
      this.preHandleLogger.debug(
        "task context is for translation task, skipping preHandle"
      );
      return;
    }

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
        this.preHandleLogger.debug("parsing response data");

        const tweets = getTweets(result.data);
        tweets.forEach((tweet) => setNotSensitive(tweet));

        this.preHandleLogger.debug("response data parsed");

        taskContext.screenshotContext.count = tweets.length;
        taskContext.screenshotContext.tweets = tweets;
      } catch (err) {
        const tweetId = taskContext.screenshotContext.url.substring(
          taskContext.screenshotContext.url.lastIndexOf("/") + 1
        );

        const failureFilePath = `./logs/failure/screenshot-${tweetId}.txt`;

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

    this.preHandleLogger.debug("exited");
  }

  /**
   * Take screenshot of the tweets
   * @param taskContext the shared task context
   */
  async handle(taskContext: ITaskContext) {
    this.handleLogger.debug("entered");

    if (taskContext.screenshotContext.count === undefined) {
      this.handleLogger.error("tweet count is undefined");
      throw new Error("cannot retrieve page data, hook failed unexpectedly");
    } else if (taskContext.screenshotContext.count < 1) {
      this.handleLogger.error("tweet count is 0 or negative");
      throw new Error(
        "cannot retrieve page data, hook failed because no tweet can be found"
      );
    }

    this.handleLogger.debug("getting clip area");

    const clipArea = await taskContext.page.evaluate((count: number) => {
      // scroll to top-left corner
      window.scrollTo({
        left: -50,
        top: -50,
      });

      const clip: ScreenshotClip = {} as ScreenshotClip;

      const articles = document.querySelectorAll(
        'article[data-testid="tweet"]'
      );

      for (let index = 0; index < count; ++index) {
        const article = articles[index];
        const boundingRect = article.parentElement.getBoundingClientRect();

        if (clip.height) {
          clip.height = boundingRect.y - clip.y + boundingRect.height;
        } else {
          clip.x = boundingRect.x;
          clip.y = boundingRect.y;
          clip.width = boundingRect.width;
          clip.height = boundingRect.height;
        }
      }

      return clip;
    }, taskContext.screenshotContext.count);

    this.handleLogger.debug(`clip area is ${JSON.stringify(clipArea)}`);

    // take screenshot as base64 string
    taskContext.screenshotContext.screenshot ??=
      (await taskContext.page.screenshot({
        encoding: "base64",
        clip: clipArea,
      })) as string;

    this.handleLogger.debug("exited");
  }
}
