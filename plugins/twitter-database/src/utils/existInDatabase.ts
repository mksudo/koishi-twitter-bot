import { Context, Query, Selection, Tables } from "koishi";

/**
 * Check if a data is already in the database
 *
 * @param ctx context of koishijs
 * @param table the name of the table to check in
 * @param query the query to find the corresponding data
 *
 * @returns whether the query found something in the database or not
 */
export const existInDatabase = async <T extends Selection.Selector<Tables>>(
  ctx: Context,
  table: T,
  query?: Query<Selection.Resolve<Tables, T>>
) => {
  const result = await ctx.database.select(table, query).execute();

  return result.length ? true : false;
};
