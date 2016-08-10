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
        Fliplet.Widget.save(file).then(Fliplet.Widget.complete);
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
      });
    })
  })
  .on('click', '#help_tip', function() {
    alert("During beta, please use live chat and let us know what you need help with.");
  });

// init
getImagesContainer();
