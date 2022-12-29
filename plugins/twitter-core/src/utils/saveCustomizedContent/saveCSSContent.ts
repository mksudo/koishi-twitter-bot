import { access, mkdir, writeFile } from "fs/promises";
import { alphanumeric } from "nanoid-dictionary";
import { customAlphabet } from "nanoid/async";

export const saveCSSContent = async (cssContent: string, guildId: string) => {
  const filenameGenerator = customAlphabet(alphanumeric, 10);
  const filename = await filenameGenerator();

  const dir = `./resources/${guildId}`;
  await access(dir).catch(() => mkdir(dir, { recursive: true }));
  const filepath = `${dir}/${filename}.css`;

  await writeFile(filepath, cssContent, { encoding: "utf-8" });
  return filepath;
};
