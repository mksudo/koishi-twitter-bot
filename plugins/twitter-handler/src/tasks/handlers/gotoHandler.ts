import pRetry from "p-retry";
import { ITaskContext } from "../../models/taskContext";
import { TaskHandler } from "../handler";

/**
 * This class handles goto task, the web page will be loaded after handle
 */
export class GotoHandler extends TaskHandler {
  protected readonly _hasPreHandle: boolean = true;

  /**
   * Set web page interception and user agent for later tasks
   * @param taskContext the shared task context
   */
  async preHandle(taskContext: ITaskContext) {
    this.preHandleLogger.debug("entered");

    taskContext.page.setRequestInterception(true);
    taskContext.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"
    );

    this.preHandleLogger.debug("exited");
  }

  /**
   * Try going to the requested url for three times
   * @param taskContext the shared task context
   */
  async handle(taskContext: ITaskContext) {
    this.handleLogger.debug("entered");
    // There will be two goto tasks for each task series
    // if the current url is already the requested url
    // then the login task is skipped, therefore no need
    // to visit the same url again
    if (taskContext.page.url() === taskContext.screenshotContext.url) {
      this.handleLogger.debug("page is already at requested url, skipping");
      return;
    }

    const goto = async () => {
      await taskContext.page.goto(taskContext.screenshotContext.url, {
        waitUntil: "networkidle2",
      });
      await taskContext.page.waitForSelector('article[data-testid="tweet"]');
    };

    this.handleLogger.debug("start trying to goto requested page");

    await pRetry(goto, {
      retries: 3,
      onFailedAttempt: (error) => {
        this.handleLogger.warn(
          `goto attempt ${error.attemptNumber} failed because of ${error.message}, ${error.retriesLeft} retries left`
        );
      },
    });

    await taskContext.page
      .waitForFunction(() =>
        Array.from(document.images).every((img) => img.complete)
      )
      .catch((err) => {
        this.handleLogger.warn(
          `wait for all images to load failed because of ${err}`
        );
      });

    this.handleLogger.debug("exited");
  }
}
