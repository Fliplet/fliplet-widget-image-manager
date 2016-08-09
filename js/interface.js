var $imagesContainer = $('.image-library');
var templates = {
  file: template('file')
};
var currentFiles;

function getImagesContainer() {
  currentFiles = [];
  $imagesContainer.html('');

  Fliplet.Media.Folders.get({
    type: 'image'
  }).then(function (response) {
    response.files.forEach(addFile);
  });
}

function addFile(file) {
  currentFiles.push(file);
  $imagesContainer.append(templates.file(file));
}

function template(name) {
  return Handlebars.compile($('#template-' + name).html());
}

// events
$('#app')
  .on('change', '#image_file', function() {
    var $input = $('#image-drop-zone').find('input');
    var fileName = $input[0].files[0].name;

    $('.upload-controls #file-name').html(fileName);
    $('#choose-image').removeClass('show');
    $('.upload-controls').addClass('show');
  })
  .on('click', '[data-select-file]', function (event) {
    event.preventDefault();
    var id = $(this).parents('.image').data('id');
    currentFiles.forEach(function (file) {
      if (file.id === id) {
        Fliplet.Widget.save(file).then(Fliplet.Widget.complete);
      }
    })
  })
  .on('submit', '[data-upload-file]', function (event) {
    $('#choose-image').addClass('show');
    $('.upload-controls').removeClass('show');

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
      $input.val('');
      files.forEach(function (file) {
        addFile(file);
      });
    });
  });

// init
getImagesContainer();
