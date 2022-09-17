import { ITwitterIdentifier } from "./identifier";

export type Modifier<T extends ITwitterIdentifier> = Pick<
  T,
  "registeredBy" | "id" | "name"
> &
  Partial<T>;
