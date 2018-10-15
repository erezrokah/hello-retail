import { clearAllItems } from 'jest-e2e-serverless/lib/utils/dynamoDb';
import { invoke } from 'jest-e2e-serverless/lib/utils/lambda';
import { testsConfig } from './config';

import fs = require('fs-extra');
import yaml = require('js-yaml');
import path = require('path');

const { region } = testsConfig;
const { photographers } = testsConfig.tables;
const { eventWriter } = testsConfig.lambdas;

describe('registerPhotographer api', () => {
  let phone = '';
  let registrations = 0;
  beforeAll(async () => {
    const doc = yaml.safeLoad(
      await fs.readFile(path.join(__dirname, '../../private.yml'), 'utf8'),
    );
    phone = `${doc.twilio[doc.stage].number}`;
    registrations = doc.behaviors.assignmentsPerRegistration[doc.stage];
  });

  beforeEach(async () => {
    await clearAllItems(region, photographers);
  });

  afterEach(async () => {
    await clearAllItems(region, photographers);
  });

  test('should create photographer entry on registerPhotographer', async () => {
    const id = 'testId';
    const name = 'testName';
    const origin = `hello-retail/e2e-test-update-phone/${id}/${name}`;
    const bodyObj = {
      id,
      origin,
      phone,
      schema: 'com.nordstrom/user-info/update-phone/1-0-0',
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

    expect.assertions(5);
    await expect({
      pollEvery: 5000,
      region,
      table: photographers,
      timeout: 30 * 1000,
    }).toHaveItem(
      { id },
      {
        assignments: 0,
        createdBy: origin,
        id,
        name,
        phone,
        registrations,
      },
      false,
    );
  });
});
