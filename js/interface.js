var $imagesContainer = $('.image-library');
var templates = {
  file: template('file'),
  folder: template('folder'),
  app: template('app'),
  noFiles: template('nofiles')
};
var currentFiles;

function getImagesContainer() {
  currentFiles = [];
  $imagesContainer.html('');

  Promise.all([
    Fliplet.Media.Folders.get({ type: 'images' }),
    Fliplet.Media.Folders.get({ type: 'images', organizationId: Fliplet.Env.get('organizationId') })
  ])
    .then(function (responses) {
      var files = _.unionBy(responses[0].files, responses[1].files, 'id');
      if (files.length) {
        files.forEach(addFile);
      } else {
        noFiles();
      }
    });
}

function addFile(file) {
  // Removes the "No image" message
  if ($('.image-library .nofiles-msg').length) {
    $('.image-library .nofiles-msg').remove();
  }
  currentFiles.push(file);
  $imagesContainer.prepend(templates.file(file));
}

function noFiles() {
  $imagesContainer.prepend(templates.noFiles());
}

function template(name) {
  return Handlebars.compile($('#template-' + name).html());
}

// events
$('#app')
  .on('change', '#image_file', function() {
    var $form = $('#image-drop-zone');

    $('#choose-image').removeClass('show');
    $('.uploading-control').addClass('show');

    $form.submit();
  })
  .on('click', '[data-select-file]', function (event) {
    event.preventDefault();
    var id = $(this).parents('.image').data('id');
    currentFiles.forEach(function (file) {
      if (file.id === id) {
        Fliplet.Widget.save(file).then(function () {
          Fliplet.Widget.complete();
        });
      }
    })
  })
  .on('submit', '[data-upload-file]', function (event) {
    var $form = $(this);
    event.preventDefault();

    var $input = $form.find('input');
    var file = $input[0].files[0];
    var formData = new FormData();

    formData.append('name', file.name);
    formData.append('file', file);

    Fliplet.Media.Files.upload({
      name: file.name,
      data: formData
    }).then(function (files) {

      $('.uploading-control').removeClass('show');
      $('.uploaded-control').addClass('show');
      setTimeout(function(){
        $('.uploaded-control').removeClass('show');
        $('#choose-image').addClass('show');
      }, 1000);

      $input.val('');
      files.forEach(function (file) {
        addFile(file);
        Fliplet.Widget.save(file).then(function () {
          Fliplet.Widget.complete();
        });
      });
    })
  })
  .on('click', '#help_tip', function() {
    alert("During beta, please use live chat and let us know what you need help with.");
  });

// init
getImagesContainer();
