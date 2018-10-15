import { deleteAllLogs } from 'jest-e2e-serverless/lib/utils/cloudwatch';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { testsConfig } from './config';

const { region } = testsConfig;
const { eventWriter, processor } = testsConfig.lambdas;

describe('sendUserLogin api', () => {
  beforeEach(async () => {
    await deleteAllLogs(region, processor);
  });

  afterEach(async () => {
    await deleteAllLogs(region, processor);
  });

  test('should log event with unsupported data schema on sendUserLogin', async () => {
    const id = 'testId';
    const name = 'testName';
    const bodyObj = {
      id,
      name,
      origin: `hello-retail/e2e-test-login-user/${id}/${name}`,
      schema: 'com.nordstrom/user-info/login/1-0-0',
    };
    const body = JSON.stringify(bodyObj);
    const payload = { body };
    const result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    });

    const actualBody = JSON.parse(result.body);
    expect(actualBody.ShardId).toStartWith('shardId');
    expect(actualBody.SequenceNumber).toMatch(/\d{10,}/);

    // assert processor lambda was executed by checking its log
    expect.assertions(5);
    await expect({
      function: processor,
      pollEvery: 5000,
      region,
      timeout: 30 * 1000,
    }).toHaveLog(
      'event with unsupported data schema (com.nordstrom/user-info/login/1-0-0) observed.',
    );
  });
});
