export const isTweetDetailRequest = (url: string) => {
  return (
    url.indexOf("twitter.com/i/api/graphql") > -1 &&
    url.indexOf("TweetDetail") > -1 &&
    url.indexOf("cursor") < 0
  );
};
