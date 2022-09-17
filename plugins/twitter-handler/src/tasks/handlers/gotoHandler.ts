import pRetry from "p-retry";
import { ITaskContext } from "../../models/taskContext";
import { TaskHandler } from "../handler";

export class GotoHandler extends TaskHandler {
  protected readonly hasPreHandle: boolean = true;

  async preHandle(taskContext: ITaskContext) {
    this.preHandleLogger.debug("entered");

    taskContext.page.setRequestInterception(true);
    taskContext.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"
    );

    this.preHandleLogger.debug("exited");
  }

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

    this.handleLogger.debug("exited");
  }
}
