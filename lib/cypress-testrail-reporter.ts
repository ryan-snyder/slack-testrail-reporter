import { reporters } from 'mocha';
import * as moment from 'moment';
import { TestRail } from './testrail';
import { titleToCaseIds } from './shared';
import { Status, TestRailResult } from './testrail.interface';
import NodeSlack from 'node-slack';
const chalk = require('chalk');

export class CypressTestRailReporter extends reporters.Spec {
  private results: TestRailResult[] = [];
  private testRail: TestRail;

  constructor(runner: any, options: any) {
    super(runner);
    let passes = 0;
    let fails = 0;
    let reporterOptions = options.reporterOptions;
    const slack = new NodeSlack(reporterOptions.slackUrl);
    this.testRail = new TestRail(reporterOptions);
    this.validate(reporterOptions, 'domain');
    this.validate(reporterOptions, 'username');
    this.validate(reporterOptions, 'password');
    this.validate(reporterOptions, 'projectId');
    this.validate(reporterOptions, 'suiteId');
    this.validate(reporterOptions, 'createTestRun');

    runner.on('start', () => {
      console.log("TEST CASE RUNNER IS STARTING!!!!!!!!!!!")
      const executionDateTime = moment().format('MMM Do YYYY, HH:mm (Z)');
      const name = `${reporterOptions.runName || 'Automated test run'} - ${executionDateTime}`;
      const description = 'For the Cypress run visit https://dashboard.cypress.io/#/projects/runs';

      reporterOptions.createTestRun === true && this.testRail.createRun(name, description);
      return;
    });

    runner.on('pass', test => {
      passes++;
      const caseIds = titleToCaseIds(test.title);
      if (caseIds.length > 0) {
        const results = caseIds.map(caseId => {
          return {
            case_id: caseId,
            status_id: Status.Passed,
            comment: `Execution time: ${test.duration}ms`,
          };
        });
        this.results.push(...results);
      }
    });

    runner.on('fail', test => {
      fails++;

      const caseIds = titleToCaseIds(test.title);
      if (caseIds.length > 0) {
        const results = caseIds.map(caseId => {
          return {
            case_id: caseId,
            status_id: Status.Failed,
            comment: `${test.err.message}`,
          };
        });
        this.results.push(...results);
      }
    });

    runner.on('end', () => {
      let messageOptions = {
          username: reporterOptions.runName+ " Tests Completed",
          text: "Passed: " + passes + " Failed: " + failures,
      };
      if (options.reporterOptions.endIcon) {
          messageOptions.icon_emoji = options.reporterOptions.endIcon;
      }else{
          messageOptions.icon_emoji = '';
      }

      slack.send(messageOptions);
      if (this.results.length == 0) {
        console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'));
        console.warn(
          '\n',
          'No testcases were matched. Ensure that your tests are declared correctly and matches Cxxx',
          '\n'
        );
        return;
      }

      this.testRail.publishResults(this.results);
    });
  }

  private validate(options, name: string) {
    if (options == null) {
      throw new Error('Missing reporterOptions in cypress.json');
    }
    if (options[name] == null) {
      throw new Error(`Missing ${name} value. Please update reporterOptions in cypress.json`);
    }
  }
}
