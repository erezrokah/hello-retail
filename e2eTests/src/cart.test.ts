import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { testsConfig } from './config';

const { region } = testsConfig;
const { eventWriter } = testsConfig.lambdas;
const { cart } = testsConfig.tables;

describe('cart api', () => {
  beforeEach(async () => {
    await clearAllItems(region, cart);
  });

  afterEach(async () => {
    await clearAllItems(region, cart);
  });

  const productId = '50000';
  const userId = 'testId';
  const friendlyName = 'Test User';
  const addToCard = {
    id: productId,
    origin: `hello-retail/e2e-test-cart-product/amzn1.account.${userId}/${friendlyName}`,
    schema: 'com.nordstrom/cart/add/1-0-0',
  };

  const removeFromCart = {
    id: productId,
    origin: `hello-retail/e2e-testt-cart-remove/amzn1.account.${userId}/${friendlyName}`,
    schema: 'com.nordstrom/cart/remove/1-0-0',
  };

  test('should add to cart on new product', async () => {
    const body = JSON.stringify(addToCard);
    const payload = { body };
    const result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);

    await expect({
      pollEvery: 5000,
      region,
      table: cart,
      timeout: 30 * 1000,
    }).toHaveItem(
      { userId, productId },
      { userId, productId, friendlyName, quantity: 1 },
      false,
    );
  });

  test('should increase quantity on adding the same product', async () => {
    const body = JSON.stringify(addToCard);
    const payload = { body };
    let result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);

    result = await invoke(region, eventWriter, payload);
    expect(result.statusCode).toBe(200);

    await expect({
      pollEvery: 5000,
      region,
      table: cart,
      timeout: 30 * 1000,
    }).toHaveItem(
      { userId, productId },
      { userId, productId, friendlyName, quantity: 2 },
      false,
    );
  });

  test('should remove product from cart', async () => {
    let body = JSON.stringify(addToCard);
    let payload = { body };
    let result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);

    await expect({
      pollEvery: 5000,
      region,
      table: cart,
      timeout: 30 * 1000,
    }).toHaveItem({ userId, productId });

    body = JSON.stringify(removeFromCart);
    payload = { body };
    result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);

    await expect({
      pollEvery: 5000,
      region,
      table: cart,
      timeout: 30 * 1000,
    }).not.toHaveItem({ userId, productId });
  });
});
