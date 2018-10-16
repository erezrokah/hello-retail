import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { stopRunningExecutions } from 'jest-e2e-serverless/lib/utils/stepFunctions';
import { testsConfig } from './config';
import { getNewProduct } from './utils';

const { region } = testsConfig;
const { eventWriter } = testsConfig.lambdas;
const { catalog, categories } = testsConfig.tables;
const { stateMachineArn } = testsConfig;

describe('newProduct api', () => {
  const tables = [catalog, categories];
  beforeEach(async () => {
    await stopRunningExecutions(region, stateMachineArn);
    await Promise.all(tables.map(table => clearAllItems(region, table)));
  });

  afterEach(async () => {
    await stopRunningExecutions(region, stateMachineArn);
    await Promise.all(tables.map(table => clearAllItems(region, table)));
  });

  test('should create product and category on product create', async () => {
    const product = getNewProduct();
    const body = JSON.stringify(product);
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

    expect.assertions(7);
    await expect({
      pollEvery: 5000,
      region,
      table: categories,
      timeout: 30 * 1000,
    }).toHaveItem(
      { category: product.category },
      {
        category: product.category,
        createdBy: product.origin,
        updatedBy: product.origin,
      },
      false,
    );
    await expect({
      pollEvery: 5000,
      region,
      table: catalog,
      timeout: 30 * 1000,
    }).toHaveItem(
      { id: product.id },
      {
        brand: product.brand,
        category: product.category,
        createdBy: product.origin,
        description: product.description,
        id: product.id,
        name: product.name,
        updatedBy: product.origin,
      },
      false,
    );
    await expect({
      pollEvery: 5000,
      region,
      stateMachineArn,
      timeout: 30 * 1000,
    }).toBeAtState('WaitAssignment');
  });
});
