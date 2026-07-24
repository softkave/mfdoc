import assert from 'assert';
import fse from 'fs-extra';
import {forEach, get, last, set} from 'lodash-es';
import type {MfdocEndpointsTableOfContent} from 'mfdoc/endpointInfo.d.ts';
import {posix} from 'path';
import {getEndpointsFromSrcPath} from './getEndpointsFromSrcPath.js';
import {kMfdocHttpHeaderItems} from './headers.js';
import {
  mfdocConstruct,
  MfdocHttpEndpointDefinitionTypePrimitive,
} from './mfdoc.js';
import {kMfdocHttpResponseItems} from './response.js';
import {filterEndpoints, getEndpointNames} from './utils.js';

function generateEndpointInfoFromEndpoints(params: {
  endpoints: MfdocHttpEndpointDefinitionTypePrimitive[];
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
}) {
  const {
    endpoints,
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
  } = params;
  const infoMap = new Map<
    MfdocHttpEndpointDefinitionTypePrimitive<any>,
    string
  >();

  const pickedEndpoints = filterEndpoints(endpoints, {
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
  forEach(pickedEndpoints, endpoint => {
    const inf = mfdocConstruct.constructHttpEndpointDefinition({
      ...endpoint,
      errorResponseHeaders:
        endpoint.errorResponseHeaders ??
        kMfdocHttpHeaderItems.responseHeaders_JsonContentType,
      errorResponseBody:
        endpoint.errorResponseBody ?? kMfdocHttpResponseItems.errorResponseBody,
    });

    infoMap.set(
      endpoint as any,
      JSON.stringify(inf, /** replacer */ undefined, /** spaces */ 4)
    );
  });

  return infoMap;
}

async function writeEndpointInfoToFile(endpointPath: string, info: string) {
  await fse.ensureFile(endpointPath);
  console.log('endpoint:', endpointPath);
  return fse.writeFile(endpointPath, info, {encoding: 'utf-8'});
}

async function writeTableOfContentToFile(
  tableOfContent: MfdocEndpointsTableOfContent[],
  outputPath: string,
  filename: string
) {
  const tableOfContentPath = posix.normalize(outputPath + '/' + filename);
  await fse.ensureFile(tableOfContentPath);
  console.log('table of content:', tableOfContentPath);
  return fse.writeFile(
    tableOfContentPath,
    JSON.stringify(tableOfContent, /** replacer */ undefined, /** spaces */ 4),
    {encoding: 'utf-8'}
  );
}

function setEndpointInTableOfContent(params: {
  tableOfContent: MfdocEndpointsTableOfContent;
  endpointNames: string[];
  endpointFilepath: string | undefined;
  backfillParents: boolean;
}) {
  const {tableOfContent, endpointNames, endpointFilepath, backfillParents} =
    params;

  const p = endpointNames.join('.children.');
  const basename = last(endpointNames);
  assert.ok(basename, 'basename is required');

  const existing = get(tableOfContent.children, p);
  const item: MfdocEndpointsTableOfContent = {
    basename,
    filepath: endpointFilepath,
    names: endpointNames,
    children: existing?.children ?? {},
  };

  set(tableOfContent.children, p, item);

  if (backfillParents) {
    endpointNames.forEach((name, index) => {
      if (index < endpointNames.length - 1) {
        setEndpointInTableOfContent({
          tableOfContent,
          endpointNames: endpointNames.slice(0, index + 1),
          endpointFilepath: undefined,
          backfillParents: false,
        });
      }
    });
  }
}

export async function genHttpApiEndpointsInfo(params: {
  endpoints: MfdocHttpEndpointDefinitionTypePrimitive[];
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
  outputPath: string;
}) {
  const {
    endpoints,
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
  } = params;
  const infoMap = generateEndpointInfoFromEndpoints({
    endpoints,
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
  const promises: Promise<any>[] = [];
  const tableOfContent: MfdocEndpointsTableOfContent = {
    basename: '',
    names: [],
    children: {},
  };

  await fse.remove(outputPath);
  infoMap.forEach((info, endpoint) => {
    const names = getEndpointNames(
      endpoint as MfdocHttpEndpointDefinitionTypePrimitive
    );
    const method = endpoint.method;
    const namesWithMethod = [
      ...names.slice(0, -1),
      `${names[names.length - 1]}__${method}`,
    ];
    const filepath = `${namesWithMethod.join('/')}.json`;
    const endpointPath = posix.normalize(outputPath + '/' + filepath);
    promises.push(writeEndpointInfoToFile(endpointPath, info));
    setEndpointInTableOfContent({
      tableOfContent,
      endpointNames: namesWithMethod,
      endpointFilepath: filepath,
      backfillParents: true,
    });
  });

  await Promise.all(promises);
  await writeTableOfContentToFile(
    Object.values(tableOfContent.children),
    outputPath,
    'table-of-content.json'
  );
}

export async function genHttpApiEndpointsInfoCmd(params: {
  srcPath: string;
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
  outputPath: string;
}) {
  const {
    srcPath,
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
  } = params;
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
  await genHttpApiEndpointsInfo({
    endpoints: filteredEndpoints,
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
  });
}
