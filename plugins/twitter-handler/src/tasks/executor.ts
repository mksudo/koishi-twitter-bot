import { Logger } from "koishi";
import PQueue from "p-queue";
import { ITaskContext } from "../models/taskContext";
import { TaskHandler } from "./handler";
import { GotoHandler } from "./handlers/gotoHandler";
import { LoginHandler } from "./handlers/loginHandler";
import { ScreenshotHandler } from "./handlers/screenshotHandler";
import { TranslateHandler } from "./handlers/translateHandler";
import { Tasks } from "./tasks";

const logger = new Logger("TaskExecutor");
if (process.env.DEBUG) logger.level = 3;

export class TaskExecutor {
  protected executor: PQueue;
  protected handlers: { [task in Tasks]: TaskHandler };

  constructor(concurrency: number, logger: Logger) {
    this.executor = new PQueue({
      concurrency,
      autoStart: true,
    });
    this.handlers = {
      goto: new GotoHandler("goto"),
      login: new LoginHandler("login"),
      screenshot: new ScreenshotHandler("screenshot"),
      translate: new TranslateHandler("translate"),
    };
  }

  async registerTask(taskContext: ITaskContext, tasks: Tasks[]) {
    return this.executor.add(
      async () => {
        for (const task of tasks)
          if (this.handlers[task].getHasPreHandle()) {
            await this.handlers[task].preHandle(taskContext).catch((err) => {
              logger.error(err);
              throw new Error(`failed at task ${task} step preHandle`);
            });
            logger.debug(`${task} preHandle accomplished`);
          }
        for (const task of tasks) {
          await this.handlers[task].handle(taskContext).catch((err) => {
            logger.error(err);
            throw new Error(`failed at task ${task} step handle`);
          });
          logger.debug(`${task} handle accomplished`);
        }
        for (const task of tasks)
          if (this.handlers[task].getHasPostHandle()) {
            await this.handlers[task].postHandle(taskContext).catch((err) => {
              logger.error(err);
              throw new Error(`failed at task ${task} step postHandle`);
            });
            logger.debug(`${task} postHandle accomplished`);
          }
      },
      {
        timeout: 600_000,
        throwOnTimeout: true,
      }
    );
  }
}
