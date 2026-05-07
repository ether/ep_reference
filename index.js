'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const {padToggle} = require('ep_plugin_helpers/pad-toggle-server');

// Parallel User Settings + Pad Wide Settings checkboxes for the reference
// pane visibility. Helper owns the storage, broadcast, enforce, and i18n
// wiring.
const referenceToggle = padToggle({
  pluginName: 'ep_reference',
  settingId: 'reference',
  l10nId: 'ep_reference.title',
  defaultLabel: 'Show Reference / Quote creator',
  defaultEnabled: false,
});

exports.loadSettings = referenceToggle.loadSettings;
exports.clientVars = referenceToggle.clientVars;
exports.eejsBlock_mySettings = referenceToggle.eejsBlock_mySettings;
exports.eejsBlock_padSettings = referenceToggle.eejsBlock_padSettings;

exports.eejsBlock_body = (hookName, args, cb) => {
  args.content += eejs.require('ep_reference/templates/reference.ejs');
  cb();
};

exports.eejsBlock_dd_help = (hookName, args, cb) => {
  cb();
};
