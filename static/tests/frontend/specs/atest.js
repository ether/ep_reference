describe('Define', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  // Create Pad
  // Defining text shows a gritter message

  it('Define a test string', function (done) {
    this.timeout(60000);
    const chrome$ = helper.padChrome$;
    if (chrome$('#options-pageview').attr('checked')) chrome$('#options-pageview').click();

    chrome$('#ep_define_input').val('time');
    chrome$('#ep_define_input_ok').click();

    const $editorContainer = chrome$('#editorcontainer');

    helper.waitFor(() => {
      $gritter = chrome$('#gritter-notice-wrapper');
      if ($gritter) return true;
    }).done(() => {
      expect($gritter).to.not.be(false);
      done();
    });
  });
});
