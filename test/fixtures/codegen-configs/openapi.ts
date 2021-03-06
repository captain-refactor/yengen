import { Config } from '../../../src/pipeline';
import { OpenapiPlugin } from '../../../src/plugins/openapi/plugin';

export const config: Config = {
    pipeline: [
        OpenapiPlugin.create({
            outputFile: './.garbage/openapi.ts',
            openapiFile: './test/fixtures/kubernetes_api.yaml'
        })
    ]
};
