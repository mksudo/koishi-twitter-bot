import fetch from "node-fetch";
import { writeFile } from "fs/promises";
import { alphanumeric } from "nanoid-dictionary";
import { customAlphabet } from "nanoid/async";

export const saveImageContent = async (url: string, guildId: string) => {
  const filenameGenerator = customAlphabet(alphanumeric, 10);
  const filename = await filenameGenerator();

  const dir = `./resources/${guildId}`;
  const filepath = `${dir}/${filename}.png`;

  const fetchResponse = await fetch(url);
  const imageContent = await fetchResponse.blob();

  await writeFile(filepath, imageContent.stream());

  return filepath;
};
