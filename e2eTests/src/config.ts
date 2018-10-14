export const testsConfig = {
  lambdas: {
    eventWriter: 'hello-retail-event-writer-api-dev-eventWriter',
    processor: 'hello-retail-product-photos-processor-dev-processor',
  },
  region: 'us-east-1',
  tables: {
    catalog: 'dev-ProductCatalog-1',
    categories: 'dev-ProductCategory-1',
  },
};
