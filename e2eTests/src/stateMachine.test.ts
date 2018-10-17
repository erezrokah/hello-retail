import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { clearAllObjects } from 'jest-e2e-serverless/lib/utils/s3';
import { stopRunningExecutions } from 'jest-e2e-serverless/lib/utils/stepFunctions';
import fetch from 'node-fetch';
import { testsConfig } from './config';
import {
  getNewProduct,
  getPhotographer,
  stagePhone,
  testPhone,
  twilioClient,
} from './utils';

const { region, imagesPath } = testsConfig;
const { eventWriter } = testsConfig.lambdas;
const {
  catalog,
  categories,
  photographers,
  photoAssignments,
} = testsConfig.tables;
const { photos } = testsConfig.buckets;
const { stateMachineArn } = testsConfig;

describe('stateMachine', () => {
  const tables = [catalog, categories, photographers, photoAssignments];
  beforeEach(async () => {
    await stopRunningExecutions(region, stateMachineArn);
    await Promise.all(tables.map(table => clearAllItems(region, table)));
    await clearAllObjects(region, photos, imagesPath);
  });

  afterEach(async () => {
    await stopRunningExecutions(region, stateMachineArn);
    await Promise.all(tables.map(table => clearAllItems(region, table)));
    await clearAllObjects(region, photos, imagesPath);
  });

  const pollEvery = 2500;
  const timeout = 30 * 1000;

  // this test simulates the following flow:
  // 1. Merchant creates a new product
  // 2. A photographer registers to the system using a phone number
  // 3. The photographer is assigned with taking a photo for the product
  // 4. The photographer receives an sms message to take a photo of the product
  // 5. The photographer responds with an mms message containing the product's photo
  // 6. The photo is saved in s3 and the photo assignment is marked as complete
  test('should assign product on new photographer and save photo on mms response', async () => {
    const product = getNewProduct();
    let payload = { body: JSON.stringify(product) };
    let result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);

    // category created
    await expect({
      pollEvery,
      region,
      table: categories,
      timeout,
    }).toHaveItem({ category: product.category });

    // product created
    await expect({
      pollEvery,
      region,
      table: catalog,
      timeout,
    }).toHaveItem({ id: product.id });

    // state machine waiting for photographer assignment
    await expect({
      pollEvery,
      region,
      stateMachineArn,
      timeout,
    }).toBeAtState('WaitAssignment');

    const photographer = getPhotographer();
    payload = { body: JSON.stringify(photographer) };
    result = await invoke(region, eventWriter, payload);

    expect(result.statusCode).toBe(200);

    // photographer created
    await expect({
      pollEvery,
      region,
      table: photographers,
      timeout,
    }).toHaveItem({ id: photographer.id });

    // assignment created
    await expect({
      pollEvery,
      region,
      table: photoAssignments,
      timeout,
    }).toHaveItem({ number: photographer.phone });

    // state machine should have AwaitPhoto state
    await expect({
      pollEvery,
      region,
      stateMachineArn,
      timeout,
    }).toHaveState('AwaitPhoto');

    // send an mms from the photogropher
    const mediaUrl =
      'https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_960_720.jpg';
    await twilioClient.messages.create({
      body: 'Simulated photo',
      from: testPhone,
      mediaUrl: [mediaUrl],
      to: stagePhone,
    });

    // state machine should have CompleteAssignment and Finish state
    await expect({
      pollEvery,
      region,
      stateMachineArn,
      timeout,
    }).toHaveState('CompleteAssignment');
    await expect({
      pollEvery,
      region,
      stateMachineArn,
      timeout,
    }).toHaveState('Finish');

    // storage bucket should have the photo from the mms message
    const expectedBuffer = await (await fetch(mediaUrl)).buffer();
    expect({ pollEvery, region, bucket: photos, timeout }).toHaveObject(
      `${imagesPath}${product.id}`,
      expectedBuffer,
    );
  });
});
