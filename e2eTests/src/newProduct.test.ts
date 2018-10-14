import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { testsConfig } from './config';

const { region } = testsConfig;
const { eventWriter } = testsConfig.lambdas;
const { catalog, categories } = testsConfig.tables;

describe('sendUserLogin api', () => {
  const tables = [catalog, categories];
  beforeEach(async () => {
    await Promise.all(tables.map(table => clearAllItems(region, table)));
  });

  afterEach(async () => {
    // await Promise.all(tables.map(table => clearAllItems(region, table)));
  });

  test('should create product and category on product create', async () => {
    const product = {
      brand: 'POLO RALPH LAUREN',
      category: 'Socks for Men',
      description: 'Best socks ever',
      id: '4579874',
      name: 'Polo Ralph Lauren 3-Pack Socks',
      origin: 'hello-retail/e2e-tests-create-product',
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
    expect.assertions(6);
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
        brand: 'POLO RALPH LAUREN',
        category: 'Socks for Men',
        createdBy: product.origin,
        description: 'Best socks evenr',
        id: '4579874',
        name: 'Polo Ralph Lauren 3-Pack Socks',
        updatedBy: product.origin,
      },
      false,
    );
  });
});
