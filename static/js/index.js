'use strict';

/* Include the Security module, we will use this later to escape a HTML attribute*/
const Security = require('ep_etherpad-lite/static/js/security');
const underscore = require('ep_etherpad-lite/static/js/underscore');
let originalRight = 0;

exports.aceEditorCSS = () => ['ep_reference/static/css/editor.css'];

exports.aceRegisterBlockElements = () => ['reference', 'quotation'];

exports.handleClientMessage_CUSTOM = (hook, context, cb) => {
  if (context.payload) {
    if (context.payload.action === 'recievereferenceMessage') {
      const message = context.payload.message;
      if (message) {
        $(message).each(function () {
          const title = this.meta.words[0].word;
          const text = this.glossary;
          $.gritter.add({title: `${title} - ${this.meta.synsetType}`, text});
          return false; // end the each
        });
      }
    }
  }
};

exports.aceInitialized = (hook, context) => {
  const editorInfo = context.editorInfo;
  editorInfo.ace_applyQuotation = exports.applyQuotation.bind(context);
};

exports.postAceInit = (name, context) => {
  context.ace.callWithAce((ace) => {
    const doc = ace.ace_getDocument();
    // Hide the controls by default -- I'm nto sure why I don't do this with CSS

    $(doc).find('head').append("<style type='text/css'>.control{display:none;}</style>");
    const $inner = $(doc).find('#innerdocbody');

    // On click ensure all image controls are hidden
    $inner.on('click', '.url > a', (e) => {
      console.log(e);
      loadPad(e.currentTarget.text);
      return false;
    });
  });

  $('#options-reference').click(function () {
    if ($(this).is(':checked')) {
      referenceShow();
    } else {
      referenceHide();
    }
  });

  $('#referenceForm').submit((e) => {
    loadPad($('#referenceInput').val());
    e.preventDefault();
  });

  $('#quotationCreate').click((e) => {
    quotationCreate(e, context);
  });
  $('#referenceCreate').click((e) => {
    referenceCreate(e, context);
  });

  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]');

  padInner.contents().on('mousedown', 'reference', (e) => {
    loadReference(e);
  });
};

// Creates a quotation event when a user clicks on the button
// Gets the text string to quote and the padId
const quotationCreate = (e, context) => {
  let text = '';
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type !== 'Control') {
    text = document.selection.createRange().text;
  }

  const padId = $('#referenceInput').val();
  insertQuotation(padId, text, context);
};

// Creates a reference event when a user clicks on the button
// Gets the text string to reference and the padId
const referenceCreate = (e, context) => {
  const padId = $('#referenceInput').val();
  insertReference(padId, context);
};

// Inserts the quotation into the pad
const insertQuotation = (padId, text, context) => {
  const padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

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
  const numberOfLines = text.split(/\r\n|\r|\n/).length;
  context.ace.callWithAce((ace) => { // call the function to apply the attribute inside ACE
    ace.ace_applyQuotation(padId, numberOfLines);
  }, 'reference', true); // TODO what's the second attribute do here?
};

// Inserts the reference into the pad
const insertReference = (padId, context) => {
  const padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

  // Puts the completed form data in the pad.
  // padeditor.ace.replaceRange(undefined, undefined, "\n");
  padeditor.ace.replaceRange(undefined, undefined, `[[${padId}]]`);

  // Put the caret back into the pad
  padeditor.ace.focus();
};

// Loads a Pads HTML from the export endpoint
const loadPad = (padId) => {
  $.ajax({
    url: `./${padId}/export/html`,
    success: (html) => {
      $('#reference').html(html); // Writes HTML to container
      $('#referenceCreate').attr('disabled', false);
      $('#quotationCreate').attr('disabled', false);
    },
  });
};

// Performed when a reference is clicked in the Pad, needs to know padId
const loadReference = (e) => {
  const padId = e.currentTarget.dataset.padid;
  loadPad(padId);
};

// Applies the line attribute to the previous line
exports.applyQuotation = function (padId, numberOfLines) {
  const rep = this.rep;
  const documentAttributeManager = this.documentAttributeManager;
  const lastLine = rep.selStart[0];
  const firstLine = lastLine - (numberOfLines - 1);

  // Line number is wrong if line breaks are copied...
  underscore(underscore.range(firstLine, lastLine + 1)).each((i) => {
    documentAttributeManager.setAttributeOnLine(i, 'quotation', padId); // make the line a task list
  });
};


exports.aceAttribsToClasses = (hook_name, args, cb) => {
  if (args.key === 'reference' && args.value !== '') {
    return cb([`reference:${args.value}`]);
  }
  if (args.key === 'quotation' && args.value !== '') {
    return cb([`quotation:${args.value}`]);
  }
};

// Here we convert the class reference into a tag
exports.aceDomLineProcessLineAttributes = (name, context) => {
  const cls = context.cls;
  let padId = /(?:^| )reference:([A-Za-z0-9]*)/.exec(cls);
  if (padId) {
    padId = padId[1];
    const modifier = {
      preHtml: `<reference data-padid="${padId}">`,
      postHtml: '</reference>',
      processedMarker: true,
    };
    return [modifier];
  }
  let qpadId = /(?:^| )quotation:([A-Za-z0-9]*)/.exec(cls);
  if (qpadId) {
    qpadId = qpadId[1];
    const modifier = {
      preHtml: `<quotation data-padid="${qpadId}">`,
      postHtml: '</quotation>',
      processedMarker: true,
    };
    return [modifier];
  }
};

// The below code is borrowed from ep_linkify and modified to open
// internally on click while maintaing the ability to open in a new window

exports.aceCreateDomLine = (name, context) => {
  let internalHref;
  let cls = context.cls;

  // TODO find a more elegant way.
  const inTimeslider = (timesliderRegexp.exec(document.location.href) != null);

  // if it already has the class of internalHref
  if (cls.indexOf('internalHref') >= 0) {
    cls = cls.replace(/(^| )internalHref:(\S+)/g, (x0, space, url) => {
      internalHref = url;
      return `${space}url`;
    });
  }

  if (internalHref) {
    const url = (inTimeslider ? '../' : './') + internalHref;
    const modifier = {
      extraOpenTags: `<a onClick="openInternally()" href="${Security.escapeHTMLAttribute(url)}">`,
      extraCloseTags: '</a>',
      cls,
    };
    return [modifier];
  }
  return;
};


/* Define the regular expressions we will use to detect if a
string looks like a reference to a pad IE [[foo]] */
const internalHrefRegexp = new RegExp(/\[\[([^\]]+)\]\]/g);

// Define a regexp to detect if we are in timeslider
const timesliderRegexp = new RegExp(/p\/[^/]*\/timeslider/g);

/* Take the string and remove the first and last 2 characters IE [[foo]] returns foo */
const linkSanitizingFn = (result) => {
  if (!result) return result;
  result.index += 2;
  const s = result[0];
  result[0] = s
      .substr(2, s.length - 4) // Skip the first two chars ([[) and omit the last ones (]])
      .replace(/\s+/g, '_'); // Every space will be replaced by an underscore
  return result;
};


/* CustomRegexp provides a wrapper around a RegExp Object which
  applies a given function to the result of the Regexp
  @param regexp the regexp to be wrapped
  @param sanitizeResultFn the function to be applied to the result.
*/
const CustomRegexp = function (regexp, sanitizeResultFn) {
  this.regexp = regexp;
  this.sanitizeResultFn = sanitizeResultFn;
};

CustomRegexp.prototype.exec = function (text) {
  const result = this.regexp.exec(text);
  return this.sanitizeResultFn(result);
};

/* getCustomRegexpFilter returns a linestylefilter compatible filter for a CustomRegexp
  @param customRegexp the CustomRegexp Object
  @param tag the tag to be filtered
  @param linestylefilter reference to linestylefilter module
*/
const getCustomRegexpFilter = (customRegexp, tag, linestylefilter) => {
  const filter = linestylefilter.getRegexpFilter(customRegexp, tag);
  return filter;
};

exports.aceGetFilterStack = (name, context) => {
  const linestylefilter = context.linestylefilter;
  const filter = getCustomRegexpFilter(
      new CustomRegexp(internalHrefRegexp, linkSanitizingFn),
      'internalHref',
      linestylefilter
  );
  return [filter];
};

const referenceShow = () => {
  $('#referenceContainer').show();

  // Commented out to leave to the user to decide
  /*
  // Hide chat and users
  if($('#options-chatandusers').is(":checked")){
    $('#options-chatandusers').click();
  }
  chat.stickToScreen(false);
  chat.hide();
  $('#chatbox').hide();
*/

  originalRight = $('#editorcontainer').css('right');
  $('#editorcontainer').css('right', '400px');
};

const referenceHide = () => {
  $('#referenceContainer').hide();
  $('#editorcontainer').css('right', originalRight);
};
