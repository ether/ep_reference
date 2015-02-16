var eejs = require('ep_etherpad-lite/node/eejs/');

exports.eejsBlock_mySettings = function (hook_name, args, cb)
{
  args.content = args.content + eejs.require('ep_reference/templates/referenceSettings.ejs', {settings : false});
  return cb();
}

exports.eejsBlock_body = function (hook_name, args, cb)
{
  args.content = args.content + eejs.require('ep_reference/templates/reference.ejs');
  return cb();
}

exports.eejsBlock_dd_help = function(hook_name, args, cb){
  // args.content = eejs.require('ep_reference/templates/reference.ejs', {settings : false}) + args.content;
  return cb();
}

