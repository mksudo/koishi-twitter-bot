export interface IParsedNode {
  needTranslation: boolean,
  content: IParsedNode[] | string,
}
