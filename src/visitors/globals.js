const Path = require('path');
const types = require('babel-types');

const genRequire = (asset, name, module = name) => {
  asset.addDependency(module);

  if (asset.options.scopeHoist) {
    return `var ${name} = $parcel$require(${asset.id}, ${JSON.stringify(
      module
    )})`;
  } else {
    return `var ${name} = require(${JSON.stringify(module)})`;
  }
};

const VARS = {
  process: asset => genRequire(asset, 'process') + ';',
  global: () => 'var global = arguments[3];',
  __dirname: asset =>
    `var __dirname = ${JSON.stringify(Path.dirname(asset.name))};`,
  __filename: asset => `var __filename = ${JSON.stringify(asset.name)};`,
  Buffer: asset => `${genRequire(asset, 'Buffer', 'buffer')}.Buffer;`
};

module.exports = {
  Identifier(node, asset, ancestors) {
    let parent = ancestors[ancestors.length - 2];
    if (
      VARS.hasOwnProperty(node.name) &&
      !asset.globals.has(node.name) &&
      types.isReferenced(node, parent)
    ) {
      asset.globals.set(node.name, VARS[node.name](asset));
    }
  },

  Declaration(node, asset, ancestors) {
    // If there is a global declaration of one of the variables, remove our declaration
    let identifiers = types.getBindingIdentifiers(node);
    for (let id in identifiers) {
      if (VARS.hasOwnProperty(id) && !inScope(ancestors)) {
        // Don't delete entirely, so we don't add it again when the declaration is referenced
        asset.globals.set(id, '');
      }
    }
  }
};

function inScope(ancestors) {
  for (let i = ancestors.length - 2; i >= 0; i--) {
    if (types.isScope(ancestors[i]) && !types.isProgram(ancestors[i])) {
      return true;
    }
  }

  return false;
}