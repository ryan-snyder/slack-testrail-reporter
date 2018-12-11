(function () {
    const Base = require('mocha').reporters.base;
    const NodeSlack = require('node-slack');
    const { reporters } = require('mocha');
    const moment = require('moment');
    const TestRail = require('./testrail');
    const { titleToCaseIds } = require ('./shared');
    const { Status, TestRailResult } = require('./testrail.interface');
    const chalk = require('chalk');
    // Going to add testrail to this
    const Slack = (function () {
        function Slack(runner, options) {
            let reporterOptions = options.reporterOptions;
            let passes = 0;
            let failures = 0;
            let messageOptions = {
                username: '',
                text: '',
                channel: '#automated-tests',
                icon_emoji: ''
            };
            const slack = new NodeSlack(reporterOptions.slackUrl);
            this.testRail = new TestRail(reporterOptions);

            runner.on('start', () => {
              console.log('TEST CASE RUNNER IS STARTING!!!!!!!');
              const executionDateTime = moment().format('MMM Do YYYY, HH:mm (Z)');
              const name = `${reporterOptions.runName || 'Automated Test Run'} - ${executionDateTime}`;
              const description = 'For the Cypress run visit https://dashboard.cypress.io/#/projects/runs';

              reporterOptions.createTestRun === true && this.testrail.createRun(name, description);
            })
            runner.on("pass", function (test) {
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

            runner.on("fail", function (test, err) {
                failures++;
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

            runner.once("end", function () {
                messageOptions = {
                    username: reporterOptions.runName+ " Tests Completed",
                    text: "Passed: " + passes + " Failed: " + failures,
                };
                if (options.reporterOptions.endIcon) {
                    messageOptions.icon_emoji = options.reporterOptions.endIcon;
                }else{
                    messageOptions.icon_emoji = '';
                }

                if (!options.reporterOptions.failureOnly) {
                    slack.send(messageOptions);
                }
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

        return Slack;

    })();

    module.exports = Slack;

}).call(this);
