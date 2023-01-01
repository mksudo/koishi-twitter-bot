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

/**
 * This class executes all registered task series
 * in a limited concurrency queue, so that the
 * resource consumption of the project is limited
 */
export class TaskExecutor {
  // the limited concurrecy promise queue
  protected executor: PQueue;
  // all implemented task handlers
  protected handlers: { [task in Tasks]: TaskHandler };

  /**
   * Instantiate the promise queue and all task handlers
   * @param concurrency the concurrency of the promise queue
   * @param logger the logger
   */
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

  /**
   * Register a series of tasks to the promise queue to be executed
   *
   * @param taskContext the context to be shared within all the tasks
   * @param tasks the tasks to be executed, will be executed with respect to the order
   *
   * @returns the wrapped promise of the tasks
   */
  async registerTask(taskContext: ITaskContext, tasks: Tasks[]) {
    return this.executor.add(
      async () => {
        // call preHandle functions for all tasks
        for (const task of tasks)
          if (this.handlers[task].hasPreHandle) {
            await this.handlers[task].preHandle(taskContext).catch((err) => {
              logger.error(err);
              throw new Error(`failed at task ${task} step preHandle`);
            });
            logger.debug(`${task} preHandle accomplished`);
          }

        // call handle functions for all tasks
        for (const task of tasks) {
          await this.handlers[task].handle(taskContext).catch((err) => {
            logger.error(err);
            throw new Error(`failed at task ${task} step handle`);
          });
          logger.debug(`${task} handle accomplished`);
        }

        // call postHandle functions for all tasks
        for (const task of tasks)
          if (this.handlers[task].hasPostHandle) {
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
