import { Logger } from "koishi";

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
