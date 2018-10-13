import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { testsConfig } from './config';

const { region } = testsConfig;
const { eventWriter } = testsConfig.lambdas;

describe('sendUserLogin api', () => {
  test('should log event with unsupported data schema on sendUserLogin', async () => {
    const id = 'someProfileId';
    const name = 'someProfileName';
    const bodyObj = {
      id,
      name,
      origin: `hello-retail/web-client-login-user/${id}/${name}`,
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
  });
});
