import { Context } from "koishi";

/**
 * Extend koishi database for twitter user settings
 * @param ctx the context of koishijs
 */
export const extendTwitterUser = (ctx: Context) => {
  ctx.model.extend(
    "twitterUser",
    {
      registeredBy: "string",
      id: "string",
      name: "string",
      tweet: {
        type: "boolean",
        initial: true,
      },
      retweet: {
        type: "boolean",
        initial: true,
      },
      comment: {
        type: "boolean",
        initial: true,
      },
      screenshot: {
        type: "boolean",
        initial: true,
      },
      text: {
        type: "boolean",
        initial: true,
      },
      translation: {
        type: "boolean",
        initial: true,
      },
      extended: {
        type: "boolean",
        initial: true,
      },
    },
    {
      primary: ["registeredBy", "id", "name"],
    }
  );
};
