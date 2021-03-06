import { camelCase, pascalCase } from 'change-case';
import {
    CodeBlockWriter,
    InterfaceDeclarationStructure,
    MethodDeclarationStructure,
    PropertyDeclarationStructure,
    PropertySignatureStructure,
    StatementStructures,
    StructureKind,
    WriterFunction
} from 'ts-morph';
import { JoiSchemaBuilder } from './joi-schema-builder';
import { OpenAPIV3 } from './openapi-types';
import { TypeBuilder } from './type-builder';
import _ = require('lodash');
import MediaTypeObject = OpenAPIV3.MediaTypeObject;
import ParameterObject = OpenAPIV3.ParameterObject;
import RequestBodyObject = OpenAPIV3.RequestBodyObject;

type HttpOperation =
    | 'get'
    | 'put'
    | 'post'
    | 'delete'
    | 'options'
    | 'head'
    | 'patch'
    | 'trace';
const HTTP_OPERATIONS: HttpOperation[] = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace'
];

export class ControllerBuilder {
    constructor(
        private document: OpenAPIV3.Document,
        private typeBuilder: TypeBuilder,
        private joiSchemaBuilder: JoiSchemaBuilder
    ) {}

    createControllers(): StatementStructures[] {
        const statements: StatementStructures[] = [];
        _.forOwn(
            this.document.paths,
            (pathItem: OpenAPIV3.PathItemObject, path: string) => {
                statements.push(...this.createController(path, pathItem));
            }
        );
        return [
            {
                kind: StructureKind.ImportDeclaration,
                moduleSpecifier: 'koa-joi-router',
                defaultImport: '* as createRouter'
            },
            {
                kind: StructureKind.ImportDeclaration,
                moduleSpecifier: 'koa',
                defaultImport: '* as koa'
            },
            this.typeBuilder.createTypings(),
            ...this.joiSchemaBuilder.createJoiSchemas(),
            {
                kind: StructureKind.Namespace,
                name: 'KoaControllers',
                isExported: true,
                statements
            }
        ];
    }

    private toTypeName(path: string, method: string, suffix: string) {
        let pathName = this.toPathName(path);
        return `${pascalCase(method)}${pathName}${suffix}`;
    }

    private pathToControllerName(path: string): string {
        let prefix = this.toPathName(path);
        return `${prefix}Controller`;
    }

    private toPathName(path: string) {
        return path
            .replace(/[\{\}]/g, '')
            .split('/')
            .map(value => {
                return pascalCase(value);
            })
            .join('');
    }

    private joinParameters(
        ...listOfLists: (ParameterObject[] | undefined)[]
    ): ParameterObject[] {
        let result: ParameterObject[] = [];
        for (let parameters of listOfLists) {
            if (parameters) result.push(...parameters);
        }
        return result;
    }

    getRequetsBodyContentSchema(
        rbo: RequestBodyObject | undefined
    ): MediaTypeObject | null {
        if (!rbo || !rbo.content) return null;
        let keys = Object.keys(rbo.content);
        if (keys.length == 0) {
            return null;
        }
        let media: OpenAPIV3.MediaTypeObject = rbo.content[keys[0]];
        return media || null;
    }

    private createRouteContextType(
        path: string,
        method: HttpOperation,
        pathItem: OpenAPIV3.PathItemObject
    ): InterfaceDeclarationStructure[] {
        let operation: OpenAPIV3.OperationObject = pathItem[method]!;
        const writeParams = (
            typeBuilder: TypeBuilder,
            paramsIn: string,
            markNonRequired: boolean
        ): WriterFunction => writer => {
            writer.write('{');
            for (let parameter of this.joinParameters(
                operation.parameters,
                pathItem.parameters
            )) {
                if (parameter.in === paramsIn) {
                    writer.write(parameter.name);
                    if (markNonRequired && !parameter.required)
                        writer.write('?');
                    if (parameter.schema) {
                        writer.write(':');
                        typeBuilder.createTypeLiteral(parameter.schema)(writer);
                    }
                    writer.write(',');
                }
            }
            writer.write('}');
        };
        let query: PropertySignatureStructure = {
            kind: StructureKind.PropertySignature,
            name: 'query',
            type: writeParams(this.typeBuilder, 'query', true)
        };
        let headers: PropertySignatureStructure = {
            kind: StructureKind.PropertySignature,
            name: 'headers',
            type: writeParams(this.typeBuilder, 'header', true)
        };
        let header: PropertySignatureStructure = {
            kind: StructureKind.PropertySignature,
            name: 'header',
            type: writeParams(this.typeBuilder, 'header', true)
        };
        let params: PropertySignatureStructure = {
            kind: StructureKind.PropertySignature,
            name: 'params',
            type: writeParams(this.typeBuilder, 'path', false)
        };

        let body: PropertySignatureStructure = {
            kind: StructureKind.PropertySignature,
            hasQuestionToken:
                operation.requestBody && !operation.requestBody.required,
            name: 'body',
            type: writer => {
                let media = this.getRequetsBodyContentSchema(
                    operation.requestBody
                );
                if (media && media.schema) {
                    this.typeBuilder.createTypeLiteral(
                        media.schema,
                        'ApiSchemas'
                    )(writer);
                } else {
                    return writer.write('undefined');
                }
            }
        };
        return [
            {
                kind: StructureKind.Interface,
                name: this.toTypeName(path, method, 'Request'),
                extends: ['koa.Request'],
                isExported: true,
                properties: [query, headers, header, params, body]
            },
            {
                kind: StructureKind.Interface,
                name: this.toTypeName(path, method, 'Context'),
                extends: ['koa.Context'],
                isExported: true,
                properties: [
                    query,
                    headers,
                    header,
                    {
                        kind: StructureKind.PropertySignature,
                        name: 'request',
                        type: this.toTypeName(path, method, 'Request')
                    }
                ]
            }
        ];
    }

    private createContextTypes(
        path: string,
        pathItem: OpenAPIV3.PathItemObject
    ): InterfaceDeclarationStructure[] {
        let result: InterfaceDeclarationStructure[] = [];
        for (let method of HTTP_OPERATIONS) {
            if (pathItem[method]) {
                result.push(
                    ...this.createRouteContextType(path, method, pathItem)
                );
            }
        }
        return result;
    }

    private createHandleMethod(
        path: string,
        method: string,
        pahtItem: OpenAPIV3.PathItemObject
    ): MethodDeclarationStructure {
        return {
            kind: StructureKind.Method,
            name: camelCase(`handle ${method}`),
            returnType: 'void',
            isAbstract: true,
            parameters: [
                {
                    name: 'ctx',
                    type: this.toTypeName(path, method, 'Context')
                }
            ]
        };
    }

    private createHandleMethods(
        path: string,
        pathItem: OpenAPIV3.PathItemObject
    ): MethodDeclarationStructure[] {
        return HTTP_OPERATIONS.filter(path => pathItem[path]).map(method =>
            this.createHandleMethod(path, method, pathItem)
        );
    }

    createController(
        path: string,
        pathItem: OpenAPIV3.PathItemObject
    ): StatementStructures[] {
        let properties: PropertyDeclarationStructure[] = [];
        for (let method of this.availableMethods(pathItem)) {
            properties.push({
                kind: StructureKind.Property,
                name: `validate${pascalCase(method)}`,
                type: "createRouter.Config['validate']",
                initializer: writer =>
                    this.writeValidate(writer, path, pathItem, method)
            });
        }
        return [
            ...this.createContextTypes(path, pathItem),
            {
                kind: StructureKind.Class,
                isExported: true,
                name: this.pathToControllerName(path),
                isAbstract: true,
                methods: [
                    ...this.createHandleMethods(path, pathItem),
                    {
                        name: 'createRouter',
                        returnType: 'createRouter.Router',
                        statements: writer => {
                            writer.write('return').space();
                            this.writeRouter(writer, path, pathItem);
                            writer.write(';');
                        }
                    }
                ],
                properties
            }
        ];
    }

    private writeRoute(
        writer: CodeBlockWriter,
        path: string,
        pathItem: OpenAPIV3.PathItemObject,
        method: HttpOperation
    ) {
        writer
            .write('.route(')
            .inlineBlock(() => {
                writer
                    .write('path: "')
                    .write(path)
                    .write('",')
                    .newLine()
                    .write('method: "')
                    .write(method)
                    .write('",')
                    .newLine()
                    .write(`validate: this.validate${pascalCase(method)},`)
                    .newLine()
                    .write('handler: ')
                    .write(`<any>this.handle${pascalCase(method)}.bind(this)`);
            })
            .write(')');
    }

    private writeValidate(
        writer: CodeBlockWriter,
        path: string,
        pathItem: OpenAPIV3.PathItemObject,
        method: HttpOperation
    ) {
        writer.inlineBlock(() => {
            if (pathItem[method]!.requestBody) {
                let media = this.getRequetsBodyContentSchema(
                    pathItem[method]!.requestBody
                );
                if (media && media.schema) {
                    writer.write('body: ');
                    this.joiSchemaBuilder.getSchemaWriter(
                        media.schema,
                        false,
                        'JoiSchemas'
                    )(writer);
                    writer.write(',').newLine();
                }
            }

            const writeParams = (paramIn: string, writer: CodeBlockWriter) => {
                for (let parameter of this.joinParameters(
                    pathItem.parameters,
                    pathItem[method]!.parameters
                )) {
                    if (parameter.in == paramIn) {
                        writer.write(parameter.name);
                        if (parameter.schema) {
                            writer.write(': ');
                            this.joiSchemaBuilder.getSchemaWriter(
                                parameter.schema,
                                false,
                                'JoiSchemas'
                            )(writer);
                            writer.write(',');
                        }
                    }
                }
            };

            writer
                .write('params: ')
                .inlineBlock(() => {
                    writeParams('path', writer);
                })
                .write(', query: ')
                .inlineBlock(() => {
                    writeParams('query', writer);
                })
                .write(', header: ')
                .inlineBlock(() => {
                    writeParams('header', writer);
                });
        });
    }

    private writeRouter(
        writer: CodeBlockWriter,
        path: string,
        pathItem: OpenAPIV3.PathItemObject
    ) {
        writer.write('createRouter()');
        for (let method of this.availableMethods(pathItem)) {
            this.writeRoute(writer, path, pathItem, method);
        }
    }

    private *availableMethods(
        pathItem: OpenAPIV3.PathItemObject
    ): IterableIterator<HttpOperation> {
        for (let method of HTTP_OPERATIONS) {
            if (pathItem[method]) yield method;
        }
    }
}
