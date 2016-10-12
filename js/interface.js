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
  $imagesContainer.append(templates.file(file));
}

function addFolder(folder) {
  $imagesContainer.append(templates.folder(folder));
}

function addApp(app) {
  $imagesContainer.append(templates.app(app));
}

function noFiles() {
  $imagesContainer.html(templates.noFiles());
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


    if (currentAppId) {
      console.log('APP >', currentAppId);
    }

    if (!currentAppId && upTo.length > 1) {
      console.log('Folder >', upTo[upTo.length - 1]);
    }

    if (!currentAppId && upTo.length > 1) {
      console.log('Folder >', upTo[upTo.length - 1]);
    }

    Fliplet.Media.Files.upload({
      appId: Fliplet.Env.get('appId'),
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


var upTo = ['root'];
var currentAppId;
var folders;

function getApps() {
  return Fliplet.Apps
    .get()
    .then(function (apps) {
      return apps.filter(function (app) {
        return !app.legacy;
      })
    });
}

function openRoot() {
  // Clean library container
  $imagesContainer.html('');

  var organizationId = Fliplet.Env.get('organizationId');
  return Promise.all([
      Fliplet.Media.Folders.get({ type: 'folders', organizationId: organizationId }),
      getApps(),
      Fliplet.Media.Folders.get({ type: 'images' }),
      Fliplet.Media.Folders.get({ type: 'images', organizationId: organizationId })
    ])
    .then(function renderRoot(values) {
      // TODO: add no files message if no files
      folders = values[0].folders;
      apps = values[1];

      values[0].folders.forEach(addFolder);
      values[1].forEach(addApp);
      values[2].files.forEach(addFile);
      values[3].files.forEach(addFile);
    })
}

function openFolder(folderId) {
  // Clean library container
  $imagesContainer.html('');

  Promise.all([
    Fliplet.Media.Folders.get({ type: 'folders', folderId: folderId }),
    Fliplet.Media.Folders.get({ type: 'images', folderId: folderId  })
  ])
    .then(function renderFolder(values) {
      // TODO: add no files message if no files
      folders = values[0].folders;

      // Render folders and files
      values[0].folders.forEach(addFolder);
      values[1].files.forEach(addFile);
    });
}

function openApp(appId) {
  Promise.all([
    Fliplet.Media.Folders.get({ type: 'folders', appId: appId }),
    Fliplet.Media.Folders.get({ type: 'images', appId: appId })
  ])
    .then(function renderApp(values) {
      $imagesContainer.html('');

      // Render folders and files
      values[0].folders.forEach(addFolder);
      values[1].files.forEach(addFile);
    });
}

$('.image-library')
  .on('dblclick', '[data-folder-id]', function () {
    var $el = $(this);
    var folderId = $el.data('folder-id');
    var parentId = $el.data('parent-id');

    if (parentId === '' && currentAppId) {
      upTo.push(_.find(apps, ['id', currentAppId]))
    } else if (parentId !== '') {
      upTo.push(_.find(folders, ['id', folderId]));
    }

    openFolder(folderId);
  })
  .on('click', '[data-file-file]', function () {
    var $el = $(this);
    var id = $el.data('file-id');
  })
  .on('dblclick', '[data-app-id]', function () {
    var $el = $(this);
    var id = $el.data('app-id');
    currentAppId = id;
    openApp(id);
  });

$('.back-btn').click(function () {
  var $el = $(this);
  var id = $el.data('file-id');

  if (upTo.length === 1) {
    openRoot();
  } else if (upTo.length === 2 && currentAppId) {
    openApp(currentAppId);
    upTo.pop();
    currentAppId = undefined;
  } else {
    var folderId = upTo.pop().id;
    openFolder(folderId);
  }
});

// init
openRoot();
