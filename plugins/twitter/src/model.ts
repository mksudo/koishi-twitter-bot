export interface Result<Status extends boolean, Content> {
  status: Status,
  content: Content,
}

export function ok<Content>(content: Content): Result<true, Content> {
  return {
    status: true,
    content,
  };
}

export function err<Content>(content: Content): Result<false, Content> {
  return {
    status: false,
    content,
  };
}
