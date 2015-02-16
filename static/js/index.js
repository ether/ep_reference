var underscore = require('ep_etherpad-lite/static/js/underscore');

exports.aceRegisterBlockElements = function(){
  return ['reference'];
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
  editorInfo.ace_applyReference = underscore(exports.applyReference).bind(context);
}

exports.postAceInit = function(name, context){

  // Hide chat and users
  if($('#options-chatandusers').is(":checked")){
    $('#options-chatandusers').click();
  }
  chat.stickToScreen(false);
  chat.hide();
  $('#editorcontainer').css("right","450px");
  $('#chatbox').hide();

  $('#referenceForm').submit(function(e){
    loadPad($('#referenceInput').val());
    e.preventDefault();
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

/*
function sendreference(){
  var myAuthorId = pad.getUserId();
  var padId = pad.getPadId();
  var message = $('#ep_reference_input').val().toLowerCase();
  // Send chat message to send to the server
  var message = {
    type : 'reference',
    action : 'sendreferenceMessage',
    message : message,
    padId : padId,
    myAuthorId : myAuthorId
  }
  pad.collabClient.sendMessage(message);  // Send the reference request to the server
}
*/

// Creates a reference event when a user clicks on the button
// Gets the text string to reference and the padId
function referenceCreate(e, context){
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  }

  var padId = $('#referenceInput').val()
  insertReference(padId, text, context);
}

// Inserts the reference into the pad
function insertReference(padId, text, context){
  var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

  // Puts the completed form data in the pad.
  padeditor.ace.replaceRange(undefined, undefined, "\n");
  padeditor.ace.replaceRange(undefined, undefined, text);

  // Put the caret back into the pad
  padeditor.ace.focus();

  // How many line breaks are in the pasted text?
  var numberOfLines = text.split(/\r\n|\r|\n/).length

  context.ace.callWithAce(function(ace){ // call the function to apply the attribute inside ACE
    ace.ace_applyReference(padId, numberOfLines);
  }, 'reference', true); // TODO what's the second attribute do here?
}

// Loads a Pads HTML from the export endpoint
function loadPad(padId){
  $.ajax({
    url: "./"+padId+"/export/html",
    success: function(html){
      $('#reference').html(html); // Writes HTML to container
    }
  });  
}

// Performed when a reference is clicked in the Pad, needs to know padId
function loadReference(e){
  var padId = e.currentTarget.dataset.padid;
  loadPad(padId);
}

// Applies the line attribute to the previous line
exports.applyReference = function(padId, numberOfLines){
  var ace = this;
  var rep = this.rep;
  var documentAttributeManager = this.documentAttributeManager;
  var lastLine = rep.selStart[0];
  var firstLine = lastLine - numberOfLines;


  // Line number is wrong if line breaks are copied...

  underscore(underscore.range(firstLine, lastLine + 1)).each(function(i){
    documentAttributeManager.setAttributeOnLine(i, 'reference', padId); // make the line a task list
  });
}

exports.aceAttribsToClasses = function(hook_name, args, cb) {
  if (args.key == 'reference' && args.value != "")
    return cb(["reference:" + args.value]);
};


// Here we convert the class reference into a tag
exports.aceDomLineProcessLineAttributes = function(name, context){
  var cls = context.cls;
  var domline = context.domline;
  var padId = /(?:^| )reference:([A-Za-z0-9]*)/.exec(cls);
  padId = padId[1];

  var modifier = {
    preHtml: '<reference data-padid="'+padId+'">',
    postHtml: '</reference>',
    processedMarker: true
  };

  return [modifier];
};

