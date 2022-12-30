import { ITaskContext } from "../../models/taskContext";
import { clickOnElement } from "../../utils/clickOnElement";
import { typeToElement } from "../../utils/typeToElement";
import { TaskHandler } from "../handler";

/**
 * This class handles the login task,
 * login to twitter webpage if necessary
 */
export class LoginHandler extends TaskHandler {
  /**
   * Login to twitter if necessary
   * @param taskContext the shared task context
   */
  async handle(taskContext: ITaskContext) {
    this.handleLogger.debug("entered");
    // check if current page needs login
    if (!(await taskContext.page.$('a[href="/login"]'))) {
      this.handleLogger.debug("current page is already logged in");
      return;
    }

    this.handleLogger.debug("clicking login button");
    await clickOnElement(await taskContext.page.$('a[href="/login"]'));
    await taskContext.page.waitForNavigation();
    this.handleLogger.debug("login button clicked");

    this.handleLogger.debug("waiting for username input element");
    await taskContext.page.waitForSelector('input[autocomplete="username"]');
    this.handleLogger.debug("typing username");
    await typeToElement(
      await taskContext.page.$('input[autocomplete="username"]'),
      taskContext.screenshotContext.credentials.name
    );
    this.handleLogger.debug("username typed");

    this.handleLogger.debug("clicking next button");
    await taskContext.page.waitForSelector(
      'input[autocomplete="current-password"]'
    );
    await clickOnElement((await taskContext.page.$$('div[role="button"]'))[2]);
    this.handleLogger.debug("next button clicked");

    this.handleLogger.debug("typing password");
    await typeToElement(
      await taskContext.page.$('input[autocomplete="current-password"]'),
      taskContext.screenshotContext.credentials.password
    );
    this.handleLogger.debug("password typed");

    this.handleLogger.debug("clicking login button");
    await Promise.race([
      taskContext.page.waitForSelector(
        'input[data-testid="SearchBox_Search_Input"]'
      ),
      taskContext.page.waitForSelector(
        'input:not([data-testid="SearchBox_Search_Input"]):not([data-testid="fileInput"])'
      ),
    ]);
    await clickOnElement(
      await taskContext.page.$(
        'div[role="button"][data-testid="LoginForm_Login_Button"]'
      )
    );
    this.handleLogger.debug("login button clicked");

    this.handleLogger.debug("waiting for verification input element");
    const verification = await taskContext.page.$(
      'input:not([data-testid="SearchBox_Search_Input"]):not([data-testid="fileInput"])'
    );

    if (verification) {
      this.handleLogger.debug("typing verification info");
      await typeToElement(
        verification,
        taskContext.screenshotContext.credentials.phoneNumber
      );
      this.handleLogger.debug("verification info typed");

      this.handleLogger.debug("clicking login button");
      await clickOnElement((await taskContext.page.$$("div[role=button]"))[1]);
      await taskContext.page.waitForNavigation();
      this.handleLogger.debug("login button clicked");
    } else {
      this.handleLogger.debug("no verification needed");
    }
    this.handleLogger.debug("exited");
  }
}
