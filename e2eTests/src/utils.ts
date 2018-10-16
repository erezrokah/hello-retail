import fs = require('fs-extra');
import yaml = require('js-yaml');
import path = require('path');
import twilio = require('twilio');

const doc = yaml.safeLoad(
  fs.readFileSync(path.join(__dirname, '../../private.yml'), 'utf8'),
);
export const testPhone = doc.twilio.test.number;
export const stagePhone = `${doc.twilio[doc.stage].number}`;

export const twilioClient = twilio(doc.twilio.accountSid, doc.twilio.authToken);

export const registrations =
  doc.behaviors.assignmentsPerRegistration[doc.stage];

export const getNewProduct = () => {
  // this is how the Web app generates the id
  const id = `0000000${Math.floor(Math.abs(Math.random() * 10000000))}`.substr(
    -7,
  );
  const product = {
    brand: 'POLO RALPH LAUREN',
    category: 'Socks for Men',
    description: 'Best socks ever',
    id,
    name: 'Polo Ralph Lauren 3-Pack Socks',
    origin: 'hello-retail/e2e-tests-create-product/System Test',
    schema: 'com.nordstrom/product/create/1-0-0',
  };
  return product;
};

export const getPhotographer = () => {
  const id = 'testPhotographerId';
  const name = 'testPhotographerName';
  const origin = `hello-retail/e2e-test-update-phone/${id}/${name}`;
  const photographer = {
    id,
    origin,
    phone: testPhone,
    schema: 'com.nordstrom/user-info/update-phone/1-0-0',
  };
  return photographer;
};
