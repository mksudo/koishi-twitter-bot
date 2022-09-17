import Puppeteer from "koishi-plugin-puppeteer";
import { Context, Logger, Schema, Service } from "koishi";
import { ITaskContext } from "./models/taskContext";
import { TaskExecutor } from "./tasks/executor";
import { Tasks } from "./tasks/tasks";
import { ITwitterCredentials } from "./models/twitterCredentials";
import { ITwitterCustomized } from "koishi-plugin-twitter-database";
import { parseTranslation } from "./utils/parseTranslation/parseTranslation";
import { TwitterApi } from "./models/twitterApi";

export { ITaskContext, TwitterApi };

declare module "koishi" {
  interface Context {
    twitterHandler: TwitterHandler;
  }
}

export const name = "twitterHandler";
export const using = ["puppeteer"];
const logger = new Logger(name);
if (process.env.DEBUG) logger.level = 3;

class TwitterHandler extends Service {
  protected taskExecutor: TaskExecutor;

  constructor(ctx: Context, protected config: TwitterHandler.Config) {
    super(ctx, name);
    this.taskExecutor = new TaskExecutor(4, logger);
  }

  async screenshot(url: string) {
    const tasks: Tasks[] = ["goto", "login", "goto", "screenshot"];
    const taskContext: ITaskContext = {
      ctx: this.ctx,
      page: await this.ctx.puppeteer.page(),
      screenshotContext: {
        url,
        credentials: this.config,
      },
    };
    await this.taskExecutor
      .registerTask(taskContext, tasks)
      .catch((err) =>
        logger.warn(
          `${name}.${this.screenshot.name} => task cancelled for reason ${err}`
        )
      )
      .finally(async () => {
        await taskContext.page
          ?.close()
          .catch((err) =>
            logger.warn(
              `${name}.${
                this.screenshot.name
              } => task clean up close page failed for reason ${JSON.stringify(
                err
              )}`
            )
          );
      });
    return taskContext;
  }

  async translate(
    url: string,
    translation: string,
    customized?: ITwitterCustomized
  ) {
    const tasks: Tasks[] = ["goto", "login", "goto", "translate", "screenshot"];
    const taskContext: ITaskContext = {
      ctx: this.ctx,
      page: await this.ctx.puppeteer.page(),
      screenshotContext: {
        url,
        credentials: this.config,
      },
      translateContext: {
        translations: parseTranslation(translation),
        customized,
      },
    };

    logger.debug(
      "parsed translation: " +
        JSON.stringify(taskContext.translateContext.translations)
    );

    await this.taskExecutor
      .registerTask(taskContext, tasks)
      .catch((err) =>
        logger.warn(
          `${name}.${
            this.translate.name
          } => task cancelled for reason ${JSON.stringify(err)}`
        )
      )
      .finally(async () => {
        await taskContext.page
          ?.close()
          .catch((err) =>
            logger.warn(
              `${name}.${
                this.translate.name
              } => task clean up close page failed for reason ${JSON.stringify(
                err
              )}`
            )
          );
      });
    return taskContext;
  }
}

namespace TwitterHandler {
  export interface Config extends ITwitterCredentials {}

  export const Config: Schema<Config> = Schema.object({
    name: Schema.string()
      .required()
      .description("required twitter username for logging in"),
    password: Schema.string()
      .required()
      .description("required twitter password for logging in"),
    phoneNumber: Schema.string()
      .required()
      .description("required twitter phone number for login verification"),
  });
}

export default TwitterHandler;
