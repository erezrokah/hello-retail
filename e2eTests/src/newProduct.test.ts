import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { stopRunningExecutions } from 'jest-e2e-serverless/lib/utils/stepFunctions';
import { testsConfig } from './config';

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
    // this is how the Web app generates the id
    const id = `0000000${Math.floor(
      Math.abs(Math.random() * 10000000),
    )}`.substr(-7);
    const product = {
      brand: 'POLO RALPH LAUREN',
      category: 'Socks for Men',
      description: 'Best socks ever',
      id,
      name: 'Polo Ralph Lauren 3-Pack Socks',
      origin: 'hello-retail/e2e-tests-create-product/System Test',
      schema: 'com.nordstrom/product/create/1-0-0',
    };
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

    // assert processor lambda was executed by checking its log
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
