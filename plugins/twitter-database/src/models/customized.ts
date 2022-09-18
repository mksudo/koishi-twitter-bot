import { ITwitterIdentifier } from "./identifier";

/**
 * Represents a customized content in the database
 */
export interface ITwitterCustomized extends ITwitterIdentifier {
  // css content to be injected into the web page
  css?: string;
  // tag base64 string to be used in the web page
  tag?: string;
  // background base64 string to be used in the web page
  background?: string;
}
