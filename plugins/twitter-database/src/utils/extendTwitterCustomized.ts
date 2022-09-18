import { Context } from "koishi";

/**
 * Extend koishi database for customized contents
 * @param ctx the context of koishijs
 */
export const extendTwitterCustomized = (ctx: Context) => {
  ctx.database.extend(
    "twitterCustomized",
    {
      registeredBy: "string",
      id: "string",
      name: "string",
      css: {
        type: "string",
        initial: "",
      },
      tag: {
        type: "string",
        initial: "",
      },
      background: {
        type: "string",
        initial: "",
      },
    },
    {
      primary: ["registeredBy", "id", "name"],
    }
  );
};
