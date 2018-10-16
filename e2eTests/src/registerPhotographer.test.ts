import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { testsConfig } from './config';
import { getPhotographer, registrations } from './utils';

const { region } = testsConfig;
const { photographers } = testsConfig.tables;
const { eventWriter } = testsConfig.lambdas;

describe('registerPhotographer api', () => {
  beforeEach(async () => {
    await clearAllItems(region, photographers);
  });

  afterEach(async () => {
    await clearAllItems(region, photographers);
  });

  test('should create photographer entry on registerPhotographer', async () => {
    const photographer = getPhotographer();
    const body = JSON.stringify(photographer);
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

    expect.assertions(5);
    await expect({
      pollEvery: 5000,
      region,
      table: photographers,
      timeout: 30 * 1000,
    }).toHaveItem(
      { id: photographer.id },
      {
        assignments: 0,
        createdBy: photographer.origin,
        id: photographer.id,
        name: photographer.origin.split('/')[3],
        phone: photographer.phone,
        registrations,
      },
      false,
    );
  });
});
