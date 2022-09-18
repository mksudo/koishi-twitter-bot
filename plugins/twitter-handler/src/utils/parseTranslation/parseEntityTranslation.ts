import { EntityTranslation } from "../../models/translation/translation";
import {
  IPollTranslation,
  IPollChoiceTranslation,
} from "../../models/translation/pollTranslation";
import {
  ICardTranslation,
  ICardTitleTranslation,
  ICardDescriptionTranslation,
} from "../../models/translation/cardTranslation";

const seperator = /\?([^? ]+) /gm;

/**
 * Parse the given translation text and extract entity translation blocks from the text
 *
 * @param translation the translation text to be parsed
 *
 * @returns parsed translation blocks for entities
 */
export const parseEntityTranslation = (translation: string) => {
  const matches = [...translation.matchAll(seperator)];

  if (!matches.length) {
    return {
      translation,
    };
  }
  const entities: EntityTranslation[] = [];

  const blocks = translation.split(seperator);
  let majorTranslation = blocks[0].trim();
  for (let index = 1; index < blocks.length - 1; index += 2) {
    const tagName = blocks[index];
    const block = blocks[index + 1];
    if (tagName.startsWith("choice")) {
      const choiceIndex = parseInt(tagName.substring("choice".length));
      if (isNaN(choiceIndex)) {
        majorTranslation += `?${tagName} ${block}`;
        continue;
      }
      const pollEntityTranslation = entities.find(
        (entityTranslation): entityTranslation is IPollTranslation =>
          entityTranslation.type === "poll"
      );
      const choiceTranslation: IPollChoiceTranslation = {
        type: "choice",
        index: pollEntityTranslation ? choiceIndex : 1,
        translation: block,
      };
      if (pollEntityTranslation)
        pollEntityTranslation.choices.push(choiceTranslation);
      else
        entities.push({
          type: "poll",
          choices: [choiceTranslation],
        });
    } else if (tagName === "title") {
      const cardTitleEntityTranslation = entities.find(
        (entityTranslation): entityTranslation is ICardTranslation =>
          entityTranslation.type === "card"
      );
      const titleTranslation: ICardTitleTranslation = {
        type: "title",
        translation: block,
      };
      if (cardTitleEntityTranslation)
        cardTitleEntityTranslation.title ??= titleTranslation;
      else
        entities.push({
          type: "card",
          title: titleTranslation,
        });
    } else if (tagName === "description") {
      const cardDescriptionEntityTranslation = entities.find(
        (entityTranslation): entityTranslation is ICardTranslation =>
          entityTranslation.type === "card"
      );
      const descriptionTranslation: ICardDescriptionTranslation = {
        type: "description",
        translation: block,
      };
      if (cardDescriptionEntityTranslation)
        cardDescriptionEntityTranslation.description ??= descriptionTranslation;
      else
        entities.push({
          type: "card",
          description: descriptionTranslation,
        });
    } else if (tagName === "quote") {
      entities.push({
        type: "quote",
        translation: block,
      });
    } else {
      majorTranslation += `?${tagName} ${block}`;
    }
  }

  return {
    translation: majorTranslation,
    entities: entities.length ? entities : undefined,
  };
};
