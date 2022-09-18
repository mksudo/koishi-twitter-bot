import { ITwitterIdentifier } from "./identifier";

// utility type that defines eveything other than the identifiers optional
export type Modifier<T extends ITwitterIdentifier> = Pick<
  T,
  "registeredBy" | "id" | "name"
> &
  Partial<T>;
