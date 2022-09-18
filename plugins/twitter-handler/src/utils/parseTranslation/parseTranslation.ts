import { ITranslation } from "../../models/translation/translation";
import { parseEntityTranslation } from "./parseEntityTranslation";

const seperator = /!(\d+) /gm;

/**
 * Parse the translation text to translation blocks
 *
 * @param translation the translation text to be parsed
 *
 * @returns parsed translation blocks
 */
export const parseTranslation = (translation: string): ITranslation[] => {
  const translations: ITranslation[] = [];
  const matches = [...translation.matchAll(seperator)];
  // not a translation for multiple tweets in a timeline
  if (!matches.length) {
    const parsedTranslation = parseEntityTranslation(translation);
    translations.push({
      index: 0,
      translation: parsedTranslation.translation,
      entities: parsedTranslation.entities,
    });
    return translations;
  }

  const blocks = translation.split(seperator);

  for (let index = 1; index < blocks.length - 1; index += 2) {
    const block = blocks[index + 1];
    const blockIndex = parseInt(blocks[index]);
    if (block === undefined || blockIndex === undefined || isNaN(blockIndex))
      continue;

    const parsedTranslation = parseEntityTranslation(block);
    translations.push({
      index: blockIndex - 1,
      translation: parsedTranslation.translation,
      entities: parsedTranslation.entities,
    });
  }

  return translations;
};
