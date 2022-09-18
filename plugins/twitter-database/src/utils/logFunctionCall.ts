import { Logger } from "koishi";

/**
 * Log a function call by its name and all the params
 *
 * @param logger koishijs logger
 * @param func the function to be logged on
 * @param args the args of the function
 */
export const logFunctionCall = (
  logger: Logger,
  func: Function,
  ...args: any[]
) => {
  logger.debug(
    `${func.name}${args.length ? "=>" : ""}${
      args.length ? JSON.stringify(args) : ""
    }`
  );
};
