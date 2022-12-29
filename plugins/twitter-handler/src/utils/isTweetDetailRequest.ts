/**
 * Determine whether the url is a tweet loading request url
 * @param url the url to be determined
 * @returns whether the input url is a tweet loading request url
 */
export const isTweetDetailRequest = (url: string) => {
  return (
    url.indexOf("api.twitter.com/graphql") > -1 &&
    url.indexOf("TweetDetail") > -1 &&
    url.indexOf("cursor") < 0
  );
};
