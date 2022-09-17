import { Context, Database, Query, Selector, Tables } from "koishi";

export const existInDatabase = async <T extends Selector<Tables>>(
  ctx: Context,
  table: T,
  query?: Query<Selector.Resolve<Tables, T>>
) => {
  const result = await ctx.database.select(table, query).execute();

  return result.length ? true : false;
};
