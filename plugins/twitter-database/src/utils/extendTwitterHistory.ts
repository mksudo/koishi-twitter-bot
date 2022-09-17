import { Context } from "koishi";

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
