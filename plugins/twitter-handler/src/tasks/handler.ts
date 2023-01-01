import { Logger } from "koishi";
import { ITaskContext } from "../models/taskContext";

/**
 * This class is an abstraction of task handlers
 */
export abstract class TaskHandler {
  // logger for the preHandle function
  protected readonly preHandleLogger: Logger;
  // logger for the handle function
  protected readonly handleLogger: Logger;
  // logger for the postHandle function
  protected readonly postHandleLogger: Logger;

  // whether the task handler has a nonempty preHandle function
  protected readonly _hasPreHandle: boolean;
  public get hasPreHandle() {
    return this._hasPreHandle;
  }
  // whether the task handler has a nonempty postHandle function
  protected readonly _hasPostHandle: boolean;
  public get hasPostHandle() {
    return this._hasPostHandle;
  }

  /**
   * Instantiate all loggers for the handler
   * @param name the name of the task
   */
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

  /**
   * This method is called before any handle function is called
   * @param taskContext the shared context of tasks
   */
  async preHandle(taskContext: ITaskContext) {}

  /**
   * This method handles the task
   * @param taskContext the shared context of tasks
   */
  abstract handle(taskContext: ITaskContext): Promise<void>;

  /**
   * This method is called after all the handle functions are called
   * @param taskContext the shared context of tasks
   */
  async postHandle(taskContext: ITaskContext) {}
}
