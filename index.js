'use strict';

const {template} = require('ep_plugin_helpers');

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

exports.eejsBlock_body =
    template('ep_reference/templates/reference.ejs');

exports.eejsBlock_dd_help = (hookName, args, cb) => {
  cb();
};
