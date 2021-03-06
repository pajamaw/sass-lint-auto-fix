import { createLogger, ILogger } from '@src/helpers';
import { autoFixSassFactory } from '@src/sass-lint-auto-fix';

import { ConfigOpts, Resolution, ValidFileType } from '@src/types';

const fs = require('fs');
const path = require('path');

import { Node, parse } from 'gonzales-pe-sl';
import { LintOpts, lintText, Ruleset } from 'sass-lint';
export interface MockLintConfigParams {
  pattern?: string | string[];
  lintRules: Ruleset;
}

export function createMockLintOptions({
  pattern,
  lintRules,
}: MockLintConfigParams): LintOpts {
  const lintOpts = {
    options: {
      'merge-default-rules': false,
      'cache-config': false,
    },
    rules: { ...lintRules },
  } as LintOpts;

  if (pattern) {
    lintOpts.files = {
      include: pattern,
    };
  }

  return lintOpts;
}

export function* resolvePattern(
  pattern: string | string[],
  lintRules: Ruleset,
  logger: ILogger,
): IterableIterator<Resolution> {
  const configOptions: ConfigOpts = {
    logger,
    files: {
      include: typeof pattern === 'string' ? [pattern] : pattern,
    },
    resolvers: { [Object.keys(lintRules)[0]]: 1 },
    syntax: {
      include: [ValidFileType.scss, ValidFileType.sass],
    },
    options: {
      optOut: true,
    },
  };

  const linterOptions: LintOpts = createMockLintOptions({ pattern, lintRules });

  const sassLintFix = autoFixSassFactory(configOptions);
  for (const resolution of sassLintFix(linterOptions)) {
    yield resolution;
  }
}

export function resolveFirst(
  pattern: string,
  lintRules: Ruleset,
  logger: ILogger = createLogger({ silentEnabled: true }),
): Resolution {
  const result = resolvePattern(pattern, lintRules, logger).next();

  if (result.value === undefined) {
    throw Error(`No resolutions exist for given pattern: ${pattern}`);
  }

  return result.value;
}

export function ast(filename: string): Node {
  const fileExtension = path.extname(filename).substr(1);

  const file = fs.readFileSync(filename);
  return parse(file.toString(), {
    syntax: fileExtension,
  });
}
export function detect(
  text: string | Buffer,
  format: ValidFileType,
  lintRules: Ruleset,
) {
  const file = {
    text,
    format,
    filename: null,
  };

  return lintText(file, createMockLintOptions({ lintRules }));
}

export function lint(filename: string, lintRules: Ruleset) {
  const file = {
    text: fs.readFileSync(filename).toString(),
    format: path.extname(filename).substr(1),
    filename,
  };

  return lintText(
    file,
    createMockLintOptions({
      pattern: filename,
      lintRules,
    }),
  );
}

export function tree(filename: string): Node {
  const content = fs.readFileSync(filename).toString();
  const syntax = path
    .extname(filename)
    .substr(1)
    .toLowerCase();

  return parse(content, { syntax });
}
