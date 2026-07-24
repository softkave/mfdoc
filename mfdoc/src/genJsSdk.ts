import assert from 'assert';
import {execSync} from 'child_process';
import fse from 'fs-extra';
import {
  camelCase,
  compact,
  forEach,
  last,
  nth,
  set,
  upperFirst,
} from 'lodash-es';
import path from 'path';
import {AnyObject, isObjectEmpty, pathSplit} from 'softkave-js-utils';
import {addCodeLinesToIndex} from './codeHelpers.js';
import {Doc} from './doc.js';
import {getEndpointsFromSrcPath} from './getEndpointsFromSrcPath.js';
import {
  isMfdocFieldArray,
  isMfdocFieldBinary,
  isMfdocFieldBoolean,
  isMfdocFieldDate,
  isMfdocFieldNull,
  isMfdocFieldNumber,
  isMfdocFieldObject,
  isMfdocFieldOrCombination,
  isMfdocFieldString,
  isMfdocFieldUndefined,
  isMfdocMultipartFormdata,
  isMfdocSdkParamsBody,
  mfdocConstruct,
  MfdocFieldArrayTypePrimitive,
  MfdocFieldBinaryTypePrimitive,
  MfdocFieldBooleanTypePrimitive,
  MfdocFieldDateTypePrimitive,
  MfdocFieldNullTypePrimitive,
  MfdocFieldNumberTypePrimitive,
  MfdocFieldObjectTypePrimitive,
  MfdocFieldOrCombinationTypePrimitive,
  MfdocFieldStringTypePrimitive,
  MfdocFieldUndefinedTypePrimitive,
  MfdocHttpEndpointDefinitionTypePrimitive,
  objectHasRequiredFields,
} from './mfdoc.js';
import {
  filterEndpoints,
  gatherDescriptionAndExample,
  getDescriptionForJsDoc,
  getEndpointNames,
  hasPackageJson,
  stringToJsDoc,
} from './utils.js';

function getEnumType(doc: Doc, item: MfdocFieldStringTypePrimitive) {
  const name = item.enumName;
  if (name && doc.generatedTypeCache.has(name)) {
    return name;
  }

  const text = item.valid?.map(next => `"${next}"`).join(' | ') ?? 'string';
  if (name) {
    doc.generatedTypeCache.set(name, true);
    doc.appendToType(
      `export type ${name} = ${text}`,
      getDescriptionForJsDoc(item.description, item.example)
    );
    return name;
  }

  return text;
}

function getStringType(doc: Doc, item: MfdocFieldStringTypePrimitive) {
  return item.valid?.length ? getEnumType(doc, item) : 'string';
}

function getNumberType(item: MfdocFieldNumberTypePrimitive) {
  return 'number';
}

function getBooleanType(item: MfdocFieldBooleanTypePrimitive) {
  return 'boolean';
}

function getNullType(item: MfdocFieldNullTypePrimitive) {
  return 'null';
}

function getUndefinedType(item: MfdocFieldUndefinedTypePrimitive) {
  return 'undefined';
}

function getDateType(item: MfdocFieldDateTypePrimitive) {
  return 'number';
}

function getArrayType(doc: Doc, item: MfdocFieldArrayTypePrimitive<any>) {
  const ofType = item.type;
  const typeString = getType(
    doc,
    ofType,
    /** asFetchResponseIfFieldBinary */ false
  );
  return `Array<${typeString}>`;
}

function getOrCombinationType(
  doc: Doc,
  item: MfdocFieldOrCombinationTypePrimitive
) {
  return item.types
    .map(next => getType(doc, next, /** asFetchResponseIfFieldBinary */ false))
    .join(' | ');
}

function getBinaryType(
  doc: Doc,
  item: MfdocFieldBinaryTypePrimitive,
  asFetchResponse: boolean
) {
  if (asFetchResponse) {
    doc.appendTypeImport(['Readable'], 'stream');
    return 'Blob | Readable';
  } else {
    doc.appendTypeImport(['Readable'], 'stream');
    return 'string | Readable | Blob | Buffer';
  }
}

function getType(
  doc: Doc,
  item: any,
  asFetchResponseIfFieldBinary: boolean
): string {
  if (isMfdocFieldString(item)) {
    return getStringType(doc, item);
  } else if (isMfdocFieldNumber(item)) {
    return getNumberType(item);
  } else if (isMfdocFieldBoolean(item)) {
    return getBooleanType(item);
  } else if (isMfdocFieldNull(item)) {
    return getNullType(item);
  } else if (isMfdocFieldUndefined(item)) {
    return getUndefinedType(item);
  } else if (isMfdocFieldDate(item)) {
    return getDateType(item);
  } else if (isMfdocFieldArray(item)) {
    return getArrayType(doc, item);
  } else if (isMfdocFieldOrCombination(item)) {
    return getOrCombinationType(doc, item);
  } else if (isMfdocFieldBinary(item)) {
    return getBinaryType(doc, item, asFetchResponseIfFieldBinary);
  } else if (isMfdocFieldObject(item)) {
    return generateObjectDefinition(doc, item, asFetchResponseIfFieldBinary);
  } else {
    return 'unknown';
  }
}

function shouldEncloseObjectKeyInQuotes(key: string) {
  return /[0-9]/.test(key[0]) || /[^A-Za-z0-9]/.test(key);
}

function generateObjectDefinition(
  doc: Doc,
  item:
    | MfdocFieldObjectTypePrimitive<any>
    | MfdocFieldObjectTypePrimitive<AnyObject>,
  asFetchResponse: boolean,
  name?: string,
  extraFields: string[] = []
) {
  name = name ?? item.name;
  if (doc.generatedTypeCache.has(name)) {
    return name;
  }

  const fields = item.fields ?? {};
  const entries: string[] = [];
  for (let key in fields) {
    const value = fields[key];
    const entryType = getType(doc, value.data, asFetchResponse);
    const separator = value.required ? ':' : '?:';
    key = shouldEncloseObjectKeyInQuotes(key) ? `"${key}"` : key;
    let entry = `${key}${separator} ${entryType};`;
    const {descriptions, examples} = gatherDescriptionAndExample(value);
    let comment = getDescriptionForJsDoc(descriptions, examples);

    if (comment) {
      comment = stringToJsDoc(comment) + '\n';
    }

    entry = `${comment}${entry}`;
    entries.push(entry);

    const valueData = value.data;
    if (isMfdocFieldObject(valueData)) {
      generateObjectDefinition(doc, valueData, asFetchResponse);
    } else if (
      isMfdocFieldArray(valueData) &&
      isMfdocFieldObject(valueData.type)
    ) {
      generateObjectDefinition(
        doc,
        valueData.type as MfdocFieldObjectTypePrimitive<any>,
        asFetchResponse
      );
    }
  }

  doc.appendToType(
    `export type ${name} = {`,
    getDescriptionForJsDoc(item.description, item.example)
  );
  entries.concat(extraFields).forEach(entry => doc.appendToType(entry));
  doc.appendToType('}');
  doc.generatedTypeCache.set(name, true);
  return name;
}

function getTypesFromEndpoint(
  endpoint: MfdocHttpEndpointDefinitionTypePrimitive
) {
  // Request body
  const sdkRequestBodyRaw = endpoint.sdkParamsBody ?? endpoint.requestBody;
  const sdkRequestObject = isMfdocFieldObject(sdkRequestBodyRaw)
    ? sdkRequestBodyRaw
    : isMfdocMultipartFormdata(sdkRequestBodyRaw)
    ? sdkRequestBodyRaw.items
    : isMfdocSdkParamsBody(sdkRequestBodyRaw)
    ? sdkRequestBodyRaw.def
    : undefined;

  // Success response body
  const successResponseBodyRaw = endpoint.responseBody;
  const successResponseBodyObject = isMfdocFieldObject(successResponseBodyRaw)
    ? successResponseBodyRaw
    : undefined;

  // Success response headers
  const successResponseHeadersObject = endpoint.responseHeaders;

  type SdkEndpointResponseType = {
    body?: any;
  };

  const successObjectFields: SdkEndpointResponseType = {};
  const requestBodyObjectHasRequiredFields =
    sdkRequestObject && objectHasRequiredFields(sdkRequestObject);

  if (successResponseBodyObject) {
    if (objectHasRequiredFields(successResponseBodyObject))
      successObjectFields.body = mfdocConstruct.constructObjectField({
        required: true,
        data: successResponseBodyObject,
      });
    else
      successObjectFields.body = mfdocConstruct.constructObjectField({
        required: false,
        data: successResponseBodyObject,
      });
  } else if (isMfdocFieldBinary(successResponseBodyRaw)) {
    successObjectFields.body = mfdocConstruct.constructObjectField({
      required: true,
      data: successResponseBodyRaw,
    });
  }

  return {
    sdkRequestBodyRaw,
    sdkRequestObject,
    successResponseBodyRaw,
    successResponseBodyObject,
    successResponseHeadersObject,
    requestBodyObjectHasRequiredFields,
  };
}

function generateTypesFromEndpoint(
  doc: Doc,
  endpoint: MfdocHttpEndpointDefinitionTypePrimitive
) {
  const {sdkRequestObject: requestBodyObject, successResponseBodyObject} =
    getTypesFromEndpoint(endpoint);

  // Request body
  if (requestBodyObject) {
    generateObjectDefinition(doc, requestBodyObject, false);
  }

  // Success response body
  if (successResponseBodyObject) {
    generateObjectDefinition(
      doc,
      successResponseBodyObject,
      /** asFetchResponse */ true
    );
  }
}

function documentTypesFromEndpoint(
  doc: Doc,
  endpoint: MfdocHttpEndpointDefinitionTypePrimitive
) {
  generateTypesFromEndpoint(doc, endpoint);
}

function decideIsBinaryRequest(
  req: ReturnType<typeof getTypesFromEndpoint>['sdkRequestBodyRaw']
) {
  return (
    isMfdocMultipartFormdata(req) ||
    (isMfdocSdkParamsBody(req) && req.serializeAs === 'formdata')
  );
}

function generateEndpointCode(
  doc: Doc,
  types: ReturnType<typeof getTypesFromEndpoint>,
  className: string,
  fnName: string,
  endpoint: MfdocHttpEndpointDefinitionTypePrimitive
) {
  const {
    sdkRequestObject,
    successResponseBodyRaw,
    successResponseBodyObject,
    sdkRequestBodyRaw: requestBodyRaw,
    requestBodyObjectHasRequiredFields,
  } = types;

  doc.appendImportFromGenTypes(
    compact([sdkRequestObject?.name, successResponseBodyObject?.name])
  );

  let param0 = '';
  let resultType = 'void';
  let templateParams = '';
  let param1 = 'opts?: MfdocEndpointOpts';

  const isBinaryRequest = decideIsBinaryRequest(requestBodyRaw);
  const isBinaryResponse = isMfdocFieldBinary(successResponseBodyRaw);
  const requestBodyObjectName = sdkRequestObject?.name;

  if (successResponseBodyObject) {
    doc.appendImportFromGenTypes([successResponseBodyObject.name]);
    resultType = successResponseBodyObject.name;
  } else if (isBinaryResponse) {
    resultType = 'MfdocEndpointResultWithBinaryResponse<TResponseType>';
  }

  if (sdkRequestObject) {
    if (requestBodyObjectHasRequiredFields) {
      param0 = `props: ${requestBodyObjectName}`;
    } else {
      param0 = `props?: ${requestBodyObjectName}`;
    }
  }

  const bodyText: string[] = [];
  let mapping = '';
  const sdkBody = endpoint.sdkParamsBody;

  if (isBinaryResponse) {
    bodyText.push('responseType: opts.responseType,');
    templateParams = "<TResponseType extends 'blob' | 'stream'>";
    param1 =
      'opts: MfdocEndpointDownloadBinaryOpts<TResponseType> ' +
      '= {responseType: "blob"} as MfdocEndpointDownloadBinaryOpts<TResponseType>';
  }

  if (isBinaryRequest) {
    bodyText.push('formdata: props,');
    param1 = 'opts?: MfdocEndpointUploadBinaryOpts';
  } else if (sdkRequestObject) {
    bodyText.push('data: props,');
  }

  if (sdkRequestObject && sdkBody) {
    forEach(sdkRequestObject.fields ?? {}, (value, key) => {
      const mapTo = sdkBody.mappings(key);

      if (mapTo) {
        const entry = `"${key}": ["${mapTo[0]}", "${String(mapTo[1])}"],`;
        mapping += entry;
      }
    });

    if (mapping.length) {
      mapping = `{${mapping}}`;
    }
  }

  const params = compact([param0, param1]).join(',');
  const text = `${fnName} = async ${templateParams}(${params}): Promise<${resultType}> => {
    ${mapping.length ? `const mapping = ${mapping} as const` : ''}
    return this.execute${isBinaryResponse ? 'Raw' : 'Json'}({
      ${bodyText.join('')}
      path: "${endpoint.path}",
      method: "${endpoint.method.toUpperCase()}",
    }, opts, ${mapping.length ? 'mapping' : ''});
  }`;

  doc.appendToClass(
    text,
    className,
    'AbstractSdkEndpoints',
    getDescriptionForJsDoc(endpoint.description, endpoint.example)
  );
}

function generateEveryEndpointCode(
  doc: Doc,
  endpoints: Array<MfdocHttpEndpointDefinitionTypePrimitive>
) {
  const leafEndpointsMap: Record<
    string,
    Record<
      string,
      {
        endpoint: MfdocHttpEndpointDefinitionTypePrimitive;
        types: ReturnType<typeof getTypesFromEndpoint>;
      }
    >
  > = {};
  const branchMap: Record<
    string,
    Record<string, Record<string, /** Record<string, any...> */ any>>
  > = {};

  endpoints.forEach(nextEndpoint => {
    const names = getEndpointNames(nextEndpoint).map(name => camelCase(name));
    assert.ok(
      names.length >= 2,
      `Endpoint name must have at least 2 parts: ${names}`
    );
    const fnName = last(names);
    const groupName = nth(names, names.length - 2);
    const className = `${upperFirst(groupName)}Endpoints`;
    const types = getTypesFromEndpoint(nextEndpoint);
    const key = `${className}.${fnName}`;
    set(leafEndpointsMap, key, {types, endpoint: nextEndpoint});

    const branches = names.slice(0, -1);
    const branchesKey = branches.join('.');
    set(branchMap, branchesKey, {});
  });

  doc.appendImport(
    [
      'type MfdocEndpointResultWithBinaryResponse',
      'type MfdocEndpointOpts',
      'type MfdocEndpointDownloadBinaryOpts',
      'type MfdocEndpointUploadBinaryOpts',
    ],
    'mfdoc-js-sdk-base'
  );
  doc.appendImport(['AbstractSdkEndpoints'], './AbstractSdkEndpoints.js');

  for (const groupName in leafEndpointsMap) {
    const group = leafEndpointsMap[groupName];

    for (const fnName in group) {
      const {types, endpoint} = group[fnName];
      generateEndpointCode(doc, types, groupName, fnName, endpoint);
    }
  }

  function docBranch(
    parentName: string | undefined,
    ownName: string,
    branch: Record<string, any>
  ) {
    if (!isObjectEmpty(branch)) {
      forEach(branch, (b1, bName) => {
        docBranch(ownName, bName, b1);
      });
    }

    if (parentName) {
      doc.appendToClass(
        `${ownName} = new ${upperFirst(ownName)}Endpoints(this.config, this);`,
        `${upperFirst(parentName)}Endpoints`,
        'AbstractSdkEndpoints'
      );
    }
  }

  for (const ownName in branchMap) {
    docBranch(undefined, ownName, branchMap[ownName]);
  }
}

function uniqEnpoints(
  endpoints: Array<MfdocHttpEndpointDefinitionTypePrimitive>
) {
  const endpointNameMap: Record<string, string> = {};

  endpoints.forEach(e1 => {
    const names = pathSplit({input: e1.path});
    const fnName = last(names);
    const method = e1.method.toLowerCase();
    const key = `${fnName}__${method}`;
    endpointNameMap[key] = key;
  });

  return endpoints.filter(e1 => {
    const names = pathSplit({input: e1.path});
    const fnName = last(names);
    const method = e1.method.toLowerCase();
    const ownKey = `${fnName}__${method}`;
    const postKey = `${fnName}__post`;
    const getKey = `${fnName}__get`;

    if (ownKey === getKey && endpointNameMap[postKey]) {
      return false;
    }

    return true;
  });
}

export async function genJsSdk(params: {
  endpoints: MfdocHttpEndpointDefinitionTypePrimitive[];
  filenamePrefix: string;
  outputDir: string;
  endpointsPath: string;
}) {
  const {endpoints, filenamePrefix, outputDir, endpointsPath} = params;
  assert.ok(
    await hasPackageJson({outputPath: outputDir}),
    'outputDir must be a valid npm package'
  );

  const endpointsDir = path.join(outputDir, endpointsPath);

  const typesFilename = `${filenamePrefix}Types`;
  const typesFilenameWithExt = `${typesFilename}.ts`;
  const typesFilepath = path.normalize(
    endpointsDir + '/' + typesFilenameWithExt
  );

  const codesFilename = `${filenamePrefix}Endpoints`;
  const codesFilenameWithExt = `${codesFilename}.ts`;
  const codesFilepath = path.normalize(
    endpointsDir + '/' + codesFilenameWithExt
  );

  const typesDoc = new Doc({genTypesFilepath: `./${typesFilenameWithExt}`});
  const codesDoc = new Doc({genTypesFilepath: `./${typesFilenameWithExt}`});

  forEach(endpoints, e1 => {
    if (e1) {
      documentTypesFromEndpoint(typesDoc, e1);
    }
  });

  const uniqHttpEndpoints = uniqEnpoints(endpoints);
  generateEveryEndpointCode(codesDoc, uniqHttpEndpoints);

  fse.ensureFileSync(typesFilepath);
  fse.ensureFileSync(codesFilepath);
  await Promise.all([
    fse.writeFile(typesFilepath, typesDoc.compileText(), {encoding: 'utf-8'}),
    fse.writeFile(codesFilepath, codesDoc.compileText(), {encoding: 'utf-8'}),
  ]);

  await addCodeLinesToIndex({
    indexPath: path.normalize(endpointsDir + '/endpointsIndex.ts'),
    codeLines: [
      {
        line: `export * from './${typesFilename}.js';`,
        keywords: [`export * from './${typesFilename}.js';`],
      },
      {
        line: `export * from './${codesFilename}.js';`,
        keywords: [`export * from './${codesFilename}.js';`],
      },
      {
        line: `export type {SdkConfig} from './SdkConfig.js';`,
        keywords: ['SdkConfig'],
      },
    ],
  });
  await addCodeLinesToIndex({
    indexPath: path.normalize(endpointsDir + '/index.ts'),
    codeLines: [
      {
        line: `export * from './endpointsIndex.js';`,
        keywords: ['endpointsIndex'],
      },
      {
        line: `export * from 'mfdoc-js-sdk-base';`,
        keywords: ['mfdoc-js-sdk-base'],
      },
    ],
  });

  execSync(`cd ${outputDir} && npm run pretty ${endpointsPath}`, {
    stdio: 'inherit',
  });
}

export async function genJsSdkCmd(params: {
  srcPath: string;
  outputPath: string;
  filenamePrefix: string;
  includeTags?: string[];
  ignoreTags?: string[];
  includeTagsRegExp?: RegExp[];
  ignoreTagsRegExp?: RegExp[];
  includePaths?: string[];
  ignorePaths?: string[];
  includePathsRegExp?: RegExp[];
  ignorePathsRegExp?: RegExp[];
  includeNames?: string[];
  ignoreNames?: string[];
  includeNamesRegExp?: RegExp[];
  ignoreNamesRegExp?: RegExp[];
  endpointsPath: string;
}) {
  const {
    srcPath,
    filenamePrefix,
    includeTags,
    ignoreTags,
    includeTagsRegExp,
    ignoreTagsRegExp,
    includePaths,
    ignorePaths,
    includePathsRegExp,
    ignorePathsRegExp,
    includeNames,
    ignoreNames,
    includeNamesRegExp,
    ignoreNamesRegExp,
    outputPath,
    endpointsPath,
  } = params;
  console.log(
    "Make sure you've ran 'setup-js-sdk' before running this command"
  );
  const endpoints = await getEndpointsFromSrcPath({srcPath});
  const filteredEndpoints = filterEndpoints(endpoints, {
    includeTags,
    ignoreTags,
    includeTagsRegExp,
    ignoreTagsRegExp,
    includePaths,
    ignorePaths,
    includePathsRegExp,
    ignorePathsRegExp,
    includeNames,
    ignoreNames,
    includeNamesRegExp,
    ignoreNamesRegExp,
  });
  console.log('Endpoints count:', filteredEndpoints.length);
  if (includeTags && includeTags.length > 0) {
    console.log('Include tags:', includeTags);
  }
  if (ignoreTags && ignoreTags.length > 0) {
    console.log('Ignore tags:', ignoreTags);
  }
  if (includeTagsRegExp && includeTagsRegExp.length > 0) {
    console.log('Include tags RegExp:', includeTagsRegExp);
  }
  if (ignoreTagsRegExp && ignoreTagsRegExp.length > 0) {
    console.log('Ignore tags RegExp:', ignoreTagsRegExp);
  }
  if (includePaths && includePaths.length > 0) {
    console.log('Include paths:', includePaths);
  }
  if (ignorePaths && ignorePaths.length > 0) {
    console.log('Ignore paths:', ignorePaths);
  }
  if (includePathsRegExp && includePathsRegExp.length > 0) {
    console.log('Include paths RegExp:', includePathsRegExp);
  }
  if (ignorePathsRegExp && ignorePathsRegExp.length > 0) {
    console.log('Ignore paths RegExp:', ignorePathsRegExp);
  }
  if (includeNames && includeNames.length > 0) {
    console.log('Include names:', includeNames);
  }
  if (ignoreNames && ignoreNames.length > 0) {
    console.log('Ignore names:', ignoreNames);
  }
  if (includeNamesRegExp && includeNamesRegExp.length > 0) {
    console.log('Include names RegExp:', includeNamesRegExp);
  }
  if (ignoreNamesRegExp && ignoreNamesRegExp.length > 0) {
    console.log('Ignore names RegExp:', ignoreNamesRegExp);
  }
  console.log('Output path:', outputPath);
  console.log('--------------------------------');
  await genJsSdk({
    endpoints: filteredEndpoints,
    filenamePrefix,
    outputDir: outputPath,
    endpointsPath,
  });
}
