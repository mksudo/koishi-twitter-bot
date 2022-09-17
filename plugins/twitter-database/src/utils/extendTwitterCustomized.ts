import { Context } from "koishi";

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
