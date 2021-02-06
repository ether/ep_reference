'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');

exports.eejsBlock_mySettings = (hookName, args, cb) => {
  args.content += eejs.require(
      'ep_reference/templates/referenceSettings.ejs', {settings: false});
  cb();
};

exports.eejsBlock_body = (hookName, args, cb) => {
  args.content += eejs.require('ep_reference/templates/reference.ejs');
  cb();
};

exports.eejsBlock_dd_help = (hookName, args, cb) => {
  // args.content = eejs.require('ep_reference/templates/reference.ejs',
  // {settings : false}) + args.content;
  cb();
};
