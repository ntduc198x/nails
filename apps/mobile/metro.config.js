/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// In this monorepo, package dependencies are installed at the workspace root.
// Metro needs both the workspace and its node_modules folder in scope so it can
// resolve and hash React Native internals on Windows correctly.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// In restricted Windows environments Metro worker child-processes can fail to spawn.
// Running with a single worker keeps transforms in-process and unblocks local AVD verification.
config.maxWorkers = 1;
module.exports = config;
