#!/usr/bin/env node
import {Command} from 'commander';
import path from 'path';
import {z} from 'zod';
import {genHttpApiEndpointsInfoCmd} from '../genHttpApiEndpointsInfo.js';
import {genJsSdkCmd} from '../genJsSdk.js';
import {setupJsSdk} from '../setupJsSdk.js';
import {parseRegExpString} from '../utils.js';

const program = new Command();

program
  .name('mfdoc')
  .description('CLI to generate JS SDK and HTTP API documentation')
  .version('0.1.0');

/**
 * Parser function for regexp options that can be specified multiple times.
 * Validates and converts regexp strings to RegExp objects.
 */
function parseRegExpOption(value: string, previous: RegExp[]): RegExp[] {
  const regexp = parseRegExpString(value);
  if (!regexp) {
    throw new Error(`Invalid regexp pattern: ${value}`);
  }
  return previous ? previous.concat([regexp]) : [regexp];
}

/**
 * Parses string options that can be provided as comma-separated values or multiple arguments.
 */
function parseStringArray(
  value: string | string[] | undefined
): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.flatMap(v => v.split(',').map((s: string) => s.trim()));
  }
  return value.split(',').map((s: string) => s.trim());
}

const setupJsSdkSchema = z.object({
  outputPath: z.string(),
  name: z.string(),
  provider: z.enum(['npm', 'yarn', 'pnpm']).optional().default('npm'),
});

program
  .command('setup-js-sdk')
  .description('Setup JS SDK and HTTP API documentation')
  .argument('<string>', 'path to the project')
  .option('-n, --name <name>', 'name of the project')
  .option('-p, --provider <provider>', 'package manager', 'npm')
  .action(async (str, options) => {
    const parsed = setupJsSdkSchema.parse({
      outputPath: str,
      name: options.name,
      provider: options.provider,
    });
    const absoluteOutputPath = path.resolve(parsed.outputPath);
    await setupJsSdk({...parsed, outputPath: absoluteOutputPath});
  });

const genJsSdkSchema = z.object({
  srcPath: z.string(),
  includeTags: z.array(z.string()).optional().default([]),
  ignoreTags: z.array(z.string()).optional().default([]),
  includeTagsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  ignoreTagsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  includePaths: z.array(z.string()).optional().default([]),
  ignorePaths: z.array(z.string()).optional().default([]),
  includePathsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  ignorePathsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  includeNames: z.array(z.string()).optional().default([]),
  ignoreNames: z.array(z.string()).optional().default([]),
  includeNamesRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  ignoreNamesRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  outputPath: z.string(),
  endpointsPath: z.string().optional().default('./src/endpoints'),
  filenamePrefix: z.string(),
});

program
  .command('gen-js-sdk')
  .description('Generate JS SDK')
  .argument('<string>', 'path to the project')
  .option(
    '-t, --include-tags <tags>',
    'tags to include (endpoints must have at least one), comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--ignore-tags <tags>',
    'tags to ignore (endpoints with these tags are filtered out), comma separated or multiple arguments. Takes precedence over include-tags. Exact string match only.'
  )
  .option(
    '--include-paths <paths>',
    'paths to include (endpoints must match at least one), comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--ignore-paths <paths>',
    'paths to ignore, comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--include-names <names>',
    'endpoint names to include (endpoints must match at least one), comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--ignore-names <names>',
    'endpoint names to ignore, comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--include-tags-regexp <pattern>',
    'regexp patterns for tags to include. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--ignore-tags-regexp <pattern>',
    'regexp patterns for tags to ignore. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--include-paths-regexp <pattern>',
    'regexp patterns for paths to include. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--ignore-paths-regexp <pattern>',
    'regexp patterns for paths to ignore. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--include-names-regexp <pattern>',
    'regexp patterns for endpoint names to include. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--ignore-names-regexp <pattern>',
    'regexp patterns for endpoint names to ignore. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option('-o, --output-path <output-path>', 'output path')
  .option(
    '-e, --endpoints-path <endpoints-path>',
    'endpoints path relative to output path, defaults to ./src/endpoints'
  )
  .option('-f, --filename-prefix <filename-prefix>', 'filename prefix')
  .action(async (str, options) => {
    const parsed = genJsSdkSchema.parse({
      srcPath: str,
      includeTags: parseStringArray(options.includeTags),
      ignoreTags: parseStringArray(options.ignoreTags),
      includeTagsRegExp: options.includeTagsRegExp || undefined,
      ignoreTagsRegExp: options.ignoreTagsRegExp || undefined,
      includePaths: parseStringArray(options.includePaths),
      ignorePaths: parseStringArray(options.ignorePaths),
      includePathsRegExp: options.includePathsRegExp || undefined,
      ignorePathsRegExp: options.ignorePathsRegExp || undefined,
      includeNames: parseStringArray(options.includeNames),
      ignoreNames: parseStringArray(options.ignoreNames),
      includeNamesRegExp: options.includeNamesRegExp || undefined,
      ignoreNamesRegExp: options.ignoreNamesRegExp || undefined,
      outputPath: options.outputPath,
      endpointsPath: options.endpointsPath,
      filenamePrefix: options.filenamePrefix,
    });
    const absoluteSrcPath = path.resolve(parsed.srcPath);
    await genJsSdkCmd({...parsed, srcPath: absoluteSrcPath});
  });

const genHttpApiEndpointsInfoSchema = z.object({
  srcPath: z.string(),
  includeTags: z.array(z.string()).optional().default([]),
  ignoreTags: z.array(z.string()).optional().default([]),
  includeTagsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  ignoreTagsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  includePaths: z.array(z.string()).optional().default([]),
  ignorePaths: z.array(z.string()).optional().default([]),
  includePathsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  ignorePathsRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  includeNames: z.array(z.string()).optional().default([]),
  ignoreNames: z.array(z.string()).optional().default([]),
  includeNamesRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  ignoreNamesRegExp: z.array(z.instanceof(RegExp)).optional().default([]),
  outputPath: z.string(),
});

program
  .command('gen-http-api-endpoints-info')
  .description('Generate HTTP API endpoints info')
  .argument('<string>', 'path to the project')
  .option(
    '-t, --include-tags <tags>',
    'tags to include (endpoints must have at least one), comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--ignore-tags <tags>',
    'tags to ignore (endpoints with these tags are filtered out), comma separated or multiple arguments. Takes precedence over include-tags. Exact string match only.'
  )
  .option(
    '--include-tags-regexp <pattern>',
    'regexp patterns for tags to include. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--ignore-tags-regexp <pattern>',
    'regexp patterns for tags to ignore. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--include-paths <paths>',
    'paths to include (endpoints must match at least one), comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--ignore-paths <paths>',
    'paths to ignore, comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--include-paths-regexp <pattern>',
    'regexp patterns for paths to include. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--ignore-paths-regexp <pattern>',
    'regexp patterns for paths to ignore. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--include-names <names>',
    'endpoint names to include (endpoints must match at least one), comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--ignore-names <names>',
    'endpoint names to ignore, comma separated or multiple arguments. Exact string match only.'
  )
  .option(
    '--include-names-regexp <pattern>',
    'regexp patterns for endpoint names to include. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option(
    '--ignore-names-regexp <pattern>',
    'regexp patterns for endpoint names to ignore. Can be specified multiple times. Format: /pattern/flags',
    parseRegExpOption,
    []
  )
  .option('-o, --output-path <output-path>', 'output path')
  .action(async (str, options) => {
    const parsed = genHttpApiEndpointsInfoSchema.parse({
      srcPath: str,
      includeTags: parseStringArray(options.includeTags),
      ignoreTags: parseStringArray(options.ignoreTags),
      includeTagsRegExp: options.includeTagsRegExp || undefined,
      ignoreTagsRegExp: options.ignoreTagsRegExp || undefined,
      includePaths: parseStringArray(options.includePaths),
      ignorePaths: parseStringArray(options.ignorePaths),
      includePathsRegExp: options.includePathsRegExp || undefined,
      ignorePathsRegExp: options.ignorePathsRegExp || undefined,
      includeNames: parseStringArray(options.includeNames),
      ignoreNames: parseStringArray(options.ignoreNames),
      includeNamesRegExp: options.includeNamesRegExp || undefined,
      ignoreNamesRegExp: options.ignoreNamesRegExp || undefined,
      outputPath: options.outputPath,
    });
    const absoluteSrcPath = path.resolve(parsed.srcPath);
    await genHttpApiEndpointsInfoCmd({
      ...parsed,
      srcPath: absoluteSrcPath,
    });
  });

program.parse();
