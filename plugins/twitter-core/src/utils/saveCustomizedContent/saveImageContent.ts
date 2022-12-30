import fetch from "node-fetch";
import fs from "fs";
import { access, mkdir } from "fs/promises";
import { alphanumeric } from "nanoid-dictionary";
import { customAlphabet } from "nanoid/async";

export const saveImageContent = async (url: string, guildId: string) => {
  const filenameGenerator = customAlphabet(alphanumeric, 10);
  const filename = await filenameGenerator();

  const dir = `./resources/${guildId}`;
  await access(dir).catch(() => mkdir(dir, { recursive: true }));
  const filepath = `${dir}/${filename}.png`;

  await fetch(url).then((response) => {
    response.body.pipe(fs.createWriteStream(filepath));
  });

  return filepath;
};
