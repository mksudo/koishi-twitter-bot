import { App } from "koishi";
import mock from "@koishijs/plugin-mock";
import memory from "@koishijs/plugin-database-memory";
import TwitterDatabase from "koishi-plugin-twitter-database";
import { expect } from "chai";

const app = new App();
app.plugin(mock);
app.plugin(memory);
app.plugin(TwitterDatabase);

const groupId = "270179048";

before(async () => {
  await app.start();
});

describe("Twitter Database", function () {
  describe("userConfig", function () {
    it("[TEST] Add user config", async function () {
      const result = await app.twitterDatabase.registerUser(
        groupId,
        "1236065517430902784",
        "bilibiliyami"
      );

      expect(result).to.be.true;
    });

    it("[TEST] Get user config by id", async function () {
      const result = await app.twitterDatabase.selectUser(
        groupId,
        "1236065517430902784"
      );

      expect(result).to.exist;

      expect(result.registeredBy).to.equal(groupId);
      expect(result.id).to.equal("1236065517430902784");
      expect(result.name).to.equal("bilibiliyami");

      for (const value of Object.values(result)) {
        if (typeof value === "boolean") {
          expect(value).to.be.true;
        }
      }
    });

    it("[TEST] Get user config by name", async function () {
      const result = await app.twitterDatabase.selectUser(
        groupId,
        undefined,
        "bilibiliyami"
      );

      expect(result).to.exist;

      expect(result.registeredBy).to.equal(groupId);
      expect(result.id).to.equal("1236065517430902784");
      expect(result.name).to.equal("bilibiliyami");

      for (const value of Object.values(result)) {
        if (typeof value === "boolean") {
          expect(value).to.be.true;
        }
      }
    });

    it("[TEST] Compare get user config result", async function () {
      const idResult = await app.twitterDatabase.selectUser(
        groupId,
        "1236065517430902784"
      );
      const nameResult = await app.twitterDatabase.selectUser(
        groupId,
        undefined,
        "bilibiliyami"
      );

      for (const [key, value] of Object.entries(idResult)) {
        expect(value).to.be.equal(nameResult[key]);
      }
    });

    it("[TEST] Add duplicate user config", async function () {
      const result = await app.twitterDatabase.registerUser(
        groupId,
        "1236065517430902784",
        "bilibiliyami"
      );

      expect(result).to.be.false;
    });

    it("[TEST] Add multiple user configs", async function () {
      const result = await app.twitterDatabase.registerUser(
        groupId,
        "1280511593630097409",
        "clearusui"
      );

      expect(result).to.be.true;
    });

    it("[TEST] Get multiple user configs", async function () {
      const results = await app.twitterDatabase.selectUsers({
        registeredBy: groupId,
      });

      expect(results).to.be.lengthOf(2);
      const names = results.map((result) => result.name);
      expect(names).to.include("clearusui");
      expect(names).to.include("bilibiliyami");
    });

    it("[TEST] Unregister nonexisting user config by name", async function () {
      const result = await app.twitterDatabase.unregisterUser(
        groupId,
        undefined,
        "bob"
      );

      expect(result).to.be.false;
    });

    it("[TEST] Unregister nonexisting user config by id", async function () {
      const result = await app.twitterDatabase.unregisterUser(
        groupId,
        "0",
        undefined
      );

      expect(result).to.be.false;
    });

    it("[TEST] Unregister existing user config", async function () {
      const result = await app.twitterDatabase.unregisterUser(
        groupId,
        undefined,
        "clearusui"
      );

      expect(result).to.be.true;

      const results = await app.twitterDatabase.selectUsers({
        registeredBy: groupId,
      });
      expect(results).to.be.lengthOf(1);
    });

    it("[TEST] Modify nonexisting user config", async function () {
      const result = await app.twitterDatabase.modifyUser({
        registeredBy: groupId,
        id: "0",
        name: "bob",
        tweet: false,
      });

      expect(result).to.be.false;
    });

    it("[TEST] Modify existing user config", async function () {
      const result = await app.twitterDatabase.modifyUser({
        registeredBy: groupId,
        id: "1236065517430902784",
        name: "bilibiliyami",
        comment: false,
        translation: false,
      });

      expect(result).to.be.true;
      const modifiedConfig = await app.twitterDatabase.selectUser(
        groupId,
        "1236065517430902784"
      );

      expect(modifiedConfig.comment).to.be.false;
      expect(modifiedConfig.translation).to.be.false;
    });
  });

  describe("history", function () {
    it("[TEST] Add history", async function () {
      const firstAddResult = await app.twitterDatabase.addHistory(
        groupId,
        "Haiyi_NEKO/status/1570477561196744709"
      );
      expect(firstAddResult.index).to.equal(1);
      const secondAddResult = await app.twitterDatabase.addHistory(
        groupId,
        "moricalliope/status/1570469122995277824"
      );
      expect(secondAddResult.index).to.equal(2);
    });

    it("[TEST] Get existing history", async function () {
      const firstResult = await app.twitterDatabase.selectHistory(groupId, 1);
      expect(firstResult).to.exist;
      expect(firstResult.url).to.equal("Haiyi_NEKO/status/1570477561196744709");

      const secondResult = await app.twitterDatabase.selectHistory(groupId, 2);
      expect(secondResult).to.exist;
      expect(secondResult.url).to.equal(
        "moricalliope/status/1570469122995277824"
      );
    });

    it("[TEST] Get nonexisting history", async function () {
      const result = await app.twitterDatabase.selectHistory(groupId, 999);
      expect(result).to.be.undefined;
    });
  });

  describe("customized", function () {
    it("[TEST] Add customized", async function () {
      await app.twitterDatabase.addCustomized({
        registeredBy: groupId,
        id: "1236065517430902784",
        name: "bilibiliyami",
        tag: "omg i love yami",
      });
    });

    it("[TEST] Get existing customized", async function () {
      const result = await app.twitterDatabase.selectCustomized(
        groupId,
        "1236065517430902784"
      );
      expect(result).to.exist;
      expect(result.name).to.equal("bilibiliyami");
      expect(result.tag).to.equal("omg i love yami");
    });

    it("[TEST] Get nonexisting customized", async function () {
      const result = await app.twitterDatabase.selectCustomized(groupId, "0");
      expect(result).to.be.undefined;
    });

    it("[TEST] Modify existing customized", async function () {
      const result = await app.twitterDatabase.modifyCustomized({
        registeredBy: groupId,
        id: "1236065517430902784",
        name: "bilibiliyami",
        tag: "yami!",
        background: "(扭曲)(蠕动)(阴暗地爬行)",
      });

      expect(result).to.be.true;

      const modifiedCustomized = await app.twitterDatabase.selectCustomized(
        groupId,
        "1236065517430902784"
      );

      expect(modifiedCustomized.tag).to.equal("yami!");
      expect(modifiedCustomized.background).to.equal(
        "(扭曲)(蠕动)(阴暗地爬行)"
      );
    });
  });
});
