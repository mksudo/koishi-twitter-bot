import { TwitterApi } from "../models/twitterApi";
import { setNotSensitive } from "./setNotSensitive";

export const getTweets = (result: TwitterApi.APIResult) => {
  const instructions =
    result.data.threaded_conversation_with_injections_v2.instructions;
  const addEntryInstruction = instructions.find(
    (instruction): instruction is TwitterApi.Instruction.AddEntryInstruction =>
      instruction.type === "TimelineAddEntries"
  );
  const entryContents = addEntryInstruction.entries.map(
    (entry) => entry.content
  );
  const timelineItems = entryContents
    .filter(
      (content): content is TwitterApi.Timeline.TimelineItem =>
        content.entryType === "TimelineTimelineItem"
    )
    .map((item) => item.itemContent)
    .filter(
      (content): content is TwitterApi.Timeline.TimelineTweet =>
        content.__typename === "TimelineTweet"
    )
    .map((content) => {
      return content;
    });
  return timelineItems.map((content) => content.tweet_results.result);
};
