import {execSync} from 'child_process';
import fse from 'fs-extra';
import path from 'path';
import {
  hasPackageJson,
  InstallScriptProvider,
  kInstallScripts,
} from './utils.js';

/**
 * setup js sdk
 * - generate from scratch
 * - update existing
 *
 * generate from scratch
 * - clone from template
 * - update package.json
 *   - name
 *
 * update existing
 * - nothing to do
 */

async function hasMfdocJsSdkBase(params: {outputPath: string}) {
  const {outputPath} = params;
  return (
    (await fse.exists(
      path.join(outputPath, 'node_modules', 'mfdoc-js-sdk-base')
    )) &&
    (
      await fse.stat(path.join(outputPath, 'node_modules', 'mfdoc-js-sdk-base'))
    ).isDirectory()
  );
}

async function installMfdocJsSdkBase(params: {
  outputPath: string;
  provider?: InstallScriptProvider;
}) {
  const {outputPath, provider = 'npm'} = params;
  execSync(`${kInstallScripts[provider]('mfdoc-js-sdk-base')}`, {
    cwd: outputPath,
    stdio: 'inherit',
  });
}

async function updatePackageJsonName(params: {
  outputPath: string;
  name: string;
}) {
  const {outputPath, name} = params;
  const packageJson = await fse.readJson(path.join(outputPath, 'package.json'));
  packageJson.name = name;
  await fse.writeJson(path.join(outputPath, 'package.json'), packageJson, {
    spaces: 2,
  });
}

async function cloneFromTemplate(params: {outputPath: string}) {
  const {outputPath} = params;
  await fse.ensureDir(outputPath);
  await fse.copy(
    path.join(import.meta.dirname, '..', 'templates', 'mfdoc-js-sdk-template'),
    outputPath,
    {
      filter: (src, dest) => {
        if (src.includes('node_modules')) {
          return false;
        }
        return true;
      },
    }
  );
}

export async function setupJsSdk(params: {
  outputPath: string;
  name: string;
  provider?: InstallScriptProvider;
}) {
  const {outputPath, name, provider = 'npm'} = params;

  if (await hasPackageJson({outputPath})) {
    if (await hasMfdocJsSdkBase({outputPath})) {
      return;
    }

    await installMfdocJsSdkBase({outputPath, provider});
    return;
  }

  await cloneFromTemplate({outputPath});
  await updatePackageJsonName({outputPath, name});
  await installMfdocJsSdkBase({outputPath, provider});
}
