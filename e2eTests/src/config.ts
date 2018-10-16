export const testsConfig = {
  buckets: {
    photos: 'dev.hello-retail.biz',
  },
  imagesPath: 'i/p/',
  lambdas: {
    eventWriter: 'hello-retail-event-writer-api-dev-eventWriter',
    processor: 'hello-retail-product-photos-processor-dev-processor',
  },
  region: 'us-east-1',
  stateMachineArn:
    'arn:aws:states:us-east-1:534156574994:stateMachine:StepFunction-xwsW3VXXMX85',
  tables: {
    catalog: 'dev-ProductCatalog-1',
    categories: 'dev-ProductCategory-1',
    photoAssignments: 'dev-hello-retail-product-photos-data-PhotoAssignments-1',
    photographers: 'dev-hello-retail-product-photos-data-PhotoRegistrations-1',
  },
};
