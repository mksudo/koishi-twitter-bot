/**
 * The common identifier in different tables
 */
export interface ITwitterIdentifier {
  // the group id of the group that registers this data
  readonly registeredBy: string;
  // the twitter id of the twitter user
  readonly id: string;
  // the screen name of the twitter user
  readonly name: string;
}
