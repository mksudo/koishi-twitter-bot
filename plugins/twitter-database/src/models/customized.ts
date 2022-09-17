import { ITwitterIdentifier } from "./identifier";

export interface ITwitterCustomized extends ITwitterIdentifier {
  css?: string;
  tag?: string;
  background?: string;
}
