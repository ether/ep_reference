/* Include the Security module, we will use this later to escape a HTML attribute*/
var Security = require('ep_etherpad-lite/static/js/security');
var underscore = require('ep_etherpad-lite/static/js/underscore');
var originalRight = 0;

exports.aceEditorCSS = function(){
  return ['ep_reference/static/css/editor.css'];
};

exports.aceRegisterBlockElements = function(){
  return ['reference', 'quotation'];
}

exports.handleClientMessage_CUSTOM = function(hook, context, cb){
  if(context.payload){
    if(context.payload.action == "recievereferenceMessage"){
      var message = context.payload.message;
      if(message){
        $(message).each(function(){
          var title = this.meta.words[0].word;
          var text = this.glossary;
          $.gritter.add({title: title + " - " + this.meta.synsetType, "text": text });
          return false; // end the each
        });
      }
    }
  }
}

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_applyQuotation = underscore(exports.applyQuotation).bind(context);
}

exports.postAceInit = function(name, context){

  context.ace.callWithAce(function(ace){
    var doc = ace.ace_getDocument();
    // Hide the controls by default -- I'm nto sure why I don't do this with CSS

    $(doc).find("head").append("<style type='text/css'>.control{display:none;}</style>");
    var $inner = $(doc).find('#innerdocbody');

    // On click ensure all image controls are hidden
    $inner.on("click", ".url > a", function(e){
      console.log(e);
      loadPad(e.currentTarget.text);
      return false;
    });
  });

  $('#options-reference').click(function(){
    if($(this).is(':checked')){
      referenceShow();
    }else{
      referenceHide();
    }
  });

  $('#referenceForm').submit(function(e){
    loadPad($('#referenceInput').val());
    e.preventDefault();
  });

  $('#quotationCreate').click(function(e){
    quotationCreate(e, context);
  });
  $('#referenceCreate').click(function(e){
    referenceCreate(e, context);
  });

  var padOuter = $('iframe[name="ace_outer"]').contents();
  var padInner = padOuter.find('iframe[name="ace_inner"]');

  padInner.contents().on("mousedown", "reference" ,function(e){
    loadReference(e);
  });  
}

// Creates a quotation event when a user clicks on the button
// Gets the text string to quote and the padId
function quotationCreate(e, context){
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  }

  var padId = $('#referenceInput').val()
  insertQuotation(padId, text, context);
}

// Creates a reference event when a user clicks on the button
// Gets the text string to reference and the padId
function referenceCreate(e, context){
  var padId = $('#referenceInput').val();
  insertReference(padId, context);
}

// Inserts the quotation into the pad
function insertQuotation(padId, text, context){
  var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

  // Clean the text - remove any trailing line breaks.
  text = text.replace(/\n$/, '');
  text = text.replace(/\r$/, '');

  // Put the clipboard into the pad
  padeditor.ace.replaceRange(undefined, undefined, text);

  // insert a line break
  // padeditor.ace.replaceRange(undefined, undefined, "\n");

  // Put the caret back into the pad
  padeditor.ace.focus();
  // How many line breaks are in the pasted text?
  var numberOfLines = text.split(/\r\n|\r|\n/).length
  context.ace.callWithAce(function(ace){ // call the function to apply the attribute inside ACE
    ace.ace_applyQuotation(padId, numberOfLines);
  }, 'reference', true); // TODO what's the second attribute do here?
}

// Inserts the reference into the pad
function insertReference(padId, context){
  var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

  // Puts the completed form data in the pad.
  // padeditor.ace.replaceRange(undefined, undefined, "\n");
  padeditor.ace.replaceRange(undefined, undefined, "[["+padId+"]]");

  // Put the caret back into the pad
  padeditor.ace.focus();
}

// Loads a Pads HTML from the export endpoint
function loadPad(padId){
  $.ajax({
    url: "./"+padId+"/export/html",
    success: function(html){
      $('#reference').html(html); // Writes HTML to container
      $('#referenceCreate').attr("disabled", false);
      $('#quotationCreate').attr("disabled", false);
    }
  });  
}

// Performed when a reference is clicked in the Pad, needs to know padId
function loadReference(e){
  var padId = e.currentTarget.dataset.padid;
  loadPad(padId);
}

// Applies the line attribute to the previous line
exports.applyQuotation = function(padId, numberOfLines){
  var ace = this;
  var rep = this.rep;
  var documentAttributeManager = this.documentAttributeManager;
  var lastLine = rep.selStart[0];
  var firstLine = lastLine - (numberOfLines-1);

  // Line number is wrong if line breaks are copied...
  underscore(underscore.range(firstLine, lastLine + 1)).each(function(i){
    documentAttributeManager.setAttributeOnLine(i, 'quotation', padId); // make the line a task list
  });
}


exports.aceAttribsToClasses = function(hook_name, args, cb) {
  if (args.key == 'reference' && args.value != ""){
    return cb(["reference:" + args.value]);
  }
  if (args.key == 'quotation' && args.value != ""){
    return cb(["quotation:" + args.value]);
  }
};

// Here we convert the class reference into a tag
exports.aceDomLineProcessLineAttributes = function(name, context){
  var cls = context.cls;
  var domline = context.domline;
  var padId = /(?:^| )reference:([A-Za-z0-9]*)/.exec(cls);
  if(padId){
    padId = padId[1];
    var modifier = {
      preHtml: '<reference data-padid="'+padId+'">',
      postHtml: '</reference>',
      processedMarker: true
    };
    return [modifier];
  }
  var qpadId = /(?:^| )quotation:([A-Za-z0-9]*)/.exec(cls);
  if(qpadId){
    qpadId = qpadId[1];
    var modifier = {
      preHtml: '<quotation data-padid="'+qpadId+'">',
      postHtml: '</quotation>',
      processedMarker: true
    };
    return [modifier];
  }
};

// The below code is borrowed from ep_linkify and modified to open
// internally on click while maintaing the ability to open in a new window

exports.aceCreateDomLine = function(name, context){
  var internalHref;
  var cls = context.cls;
  var domline = context.domline;

  // TODO find a more elegant way.
  var inTimeslider = (timesliderRegexp.exec(document.location.href) !== null);

  if (cls.indexOf('internalHref') >= 0) // if it already has the class of internalHref
  {
    cls = cls.replace(/(^| )internalHref:(\S+)/g, function(x0, space, url)
    {
      internalHref = url;
      return space + "url";
    });
  }

  if (internalHref)
  {
    var url = (inTimeslider ? '../' : './') + internalHref;
    var modifier = {
      extraOpenTags: '<a onClick="openInternally()" href="' + Security.escapeHTMLAttribute(url) +'">',
      extraCloseTags: '</a>',
      cls: cls
    }
    return [modifier];
  }
  return;
}


/* Define the regular expressions we will use to detect if a string looks like a reference to a pad IE [[foo]] */
var internalHrefRegexp = new RegExp(/\[\[([^\]]+)\]\]/g);

// Define a regexp to detect if we are in timeslider
var timesliderRegexp = new RegExp(/p\/[^\/]*\/timeslider/g);

/* Take the string and remove the first and last 2 characters IE [[foo]] returns foo */
var linkSanitizingFn = function(result){
  if(!result) return result;
  result.index = result.index + 2;
  var s = result[0];
  result[0] = s
    .substr(2,s.length-4) // Skip the first two chars ([[) and omit the last ones (]])
    .replace(/\s+/g, '_'); // Every space will be replaced by an underscore
  return result;
};


/* CustomRegexp provides a wrapper around a RegExp Object which applies a given function to the result of the Regexp
  @param regexp the regexp to be wrapped
  @param sanitizeResultFn the function to be applied to the result.
*/
var CustomRegexp = function(regexp, sanitizeResultFn){
  this.regexp = regexp;
  this.sanitizeResultFn = sanitizeResultFn;
};

CustomRegexp.prototype.exec = function(text){
  var result = this.regexp.exec(text);
  return this.sanitizeResultFn(result);
}

/* getCustomRegexpFilter returns a linestylefilter compatible filter for a CustomRegexp
  @param customRegexp the CustomRegexp Object
  @param tag the tag to be filtered
  @param linestylefilter reference to linestylefilter module
*/
var getCustomRegexpFilter = function(customRegexp, tag, linestylefilter)
{
  var filter =  linestylefilter.getRegexpFilter(customRegexp, tag);
  return filter;
}

exports.aceGetFilterStack = function(name, context){
  var linestylefilter = context.linestylefilter;
  var filter = getCustomRegexpFilter(
    new CustomRegexp(internalHrefRegexp, linkSanitizingFn),
    'internalHref',
    linestylefilter
  );
  return [filter];
}

function referenceShow(){
  $('#referenceContainer').show();

  // Hide chat and users
  if($('#options-chatandusers').is(":checked")){
    $('#options-chatandusers').click();
  }
  chat.stickToScreen(false);
  chat.hide();
  originalRight = $('#editorcontainer').css("right");
  $('#editorcontainer').css("right","400px");
  $('#chatbox').hide();
}

function referenceHide(){
  $('#referenceContainer').hide();
  $('#editorcontainer').css("right",originalRight);
}
