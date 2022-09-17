import { Logger } from "koishi";
import { ITaskContext } from "../models/taskContext";

export abstract class TaskHandler {
  protected readonly preHandleLogger: Logger;
  protected readonly handleLogger: Logger;
  protected readonly postHandleLogger: Logger;

  protected readonly hasPreHandle: boolean;
  protected readonly hasPostHandle: boolean;

  constructor(name: string) {
    const logger = new Logger(name);
    this.preHandleLogger = logger.extend(this.preHandle.name);
    this.handleLogger = logger.extend(this.handle.name);
    this.postHandleLogger = logger.extend(this.postHandle.name);

    if (process.env.DEBUG) {
      this.preHandleLogger.level = 3;
      this.handleLogger.level = 3;
      this.postHandleLogger.level = 3;
    }
  }

  async preHandle(taskContext: ITaskContext) {}

  abstract handle(taskContext: ITaskContext): Promise<void>;

  async postHandle(taskContext: ITaskContext) {}

  getHasPreHandle() {
    return this.hasPreHandle;
  }

  getHasPostHandle() {
    return this.hasPostHandle;
  }
}
