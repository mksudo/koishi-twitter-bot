import { Context } from "koishi";

/**
 * Extend koishi database for the twitter histories
 * @param ctx the context of koishijs
 */
export const extendTwitterHistory = (ctx: Context) => {
  ctx.database.extend(
    "twitterHistory",
    {
      registeredBy: "string",
      index: "unsigned",
      url: "string",
    },
    {
      primary: "index",
      autoInc: true,
    }
  );
};
