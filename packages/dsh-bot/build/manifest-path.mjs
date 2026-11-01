import path from 'node:path';

// Manifest keys are portable URL-relative paths, independent of the build host.
export function moduleManifestKey(root, file, pathApi = path) {
  return pathApi.relative(root, file).split(pathApi.sep).join('/');
}
