var $imagesContainer = $('.image-library');
var $imageForm = $('#image-drop-zone');
var $imageInput = $imageForm.find('input');

var templates = {};

[
  'app',
  'file',
  'folder',
  'organization',
  'nofiles'
].forEach(function (tpl) {
  templates[tpl] = Fliplet.Widget.Templates['templates.' + tpl];
});

function addFile(file) {
  $imagesContainer.append(templates.file(file));
}

function addFolder(folder) {
  $imagesContainer.append(templates.folder(folder));
}

function addApp(app) {
  $imagesContainer.append(templates.app(app));
}

function addOrganization(organization) {
  $imagesContainer.append(templates.organization(organization));
}

function noFiles() {
  $imagesContainer.html(templates.nofiles());
}

function template(name) {
  return Handlebars.compile($('#template-' + name).html());
}

function uploadImage(image) {
  var formData = new FormData();

  $('#choose-image').removeClass('show');
  $('.uploading-control').addClass('show');

  formData.append('name', image.name);
  formData.append('file', image);

  var options = {
    name: image.name,
    data: formData
  };

  if (upTo[upTo.length - 1].type) {
    options[upTo[upTo.length - 1].type] = upTo[upTo.length - 1].id;
  }

  return Fliplet.Media.Files.upload(options)
    .then(function (files) {
      var uploadedFile = files[0];

      $('.uploading-control').removeClass('show');
      $('.uploaded-control').addClass('show');

      setTimeout(function(){
        $('.uploaded-control').removeClass('show');
        $('#choose-image').addClass('show');
      }, 1000);

      $imageInput.val('');

      addFile(uploadedFile);
      return Fliplet.Widget.save(uploadedFile);
    })
    .then(function () {
      return Fliplet.Widget.complete();
    });
}

// events
$('#app')
  .on('change', '#image_file', function() {
    uploadImage($imageInput[0].files[0]);
  })
  .on('click', '#help_tip', function() {
    alert("During beta, please use live chat and let us know what you need help with.");
  });

$imageForm
  .on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
  })
  .on('dragover dragenter', function() {
    $imageForm.addClass('is-dragover');
  })
  .on('dragleave dragend drop', function() {
    $imageForm.removeClass('is-dragover');
  })
  .on('drop', function(e) {
    droppedFiles = e.originalEvent.dataTransfer.files;
    uploadImage(droppedFiles[0]);
  });


var upTo = [{ back: openRoot}];
var folders,
  apps,
  organizations,
  currentFiles,
  selectedFileId;

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

  // Update paths
  $('.breadcrumbs-select').hide();
  $('.back-btn').hide();

  var organizationId = Fliplet.Env.get('organizationId');
  return Promise.all([
    Fliplet.Organizations.get(),
    getApps()
  ]).then(function renderRoot(values) {
    organizations = values[0];
    apps = values[1];

    values[0].forEach(addOrganization);
    values[1].forEach(addApp)
    Fliplet.Widget.autosize();
  });
}

function openFolder(folderId) {
  Promise.all([
    Fliplet.Media.Folders.get({ type: 'folders', folderId: folderId }),
    Fliplet.Media.Folders.get({ type: 'images', folderId: folderId  })
  ])
    .then(renderFolderContent);
}

function openApp(appId) {
  Promise.all([
    Fliplet.Media.Folders.get({ type: 'folders', appId: appId }),
    Fliplet.Media.Folders.get({ type: 'images', appId: appId })
  ])
    .then(renderFolderContent);
}

function renderFolderContent(values) {
  $('.folder-selection span').html('Select an image below')
  $imagesContainer.html('');

  if (!values[0].folders.length && !values[1].files.length) {
    return noFiles();
  }
  folders = values[0].folders;
  currentFiles = values[1].files;

  // Render folders and files
  _.sortBy(values[0].folders, ['name']).forEach(addFolder);
  _.sortBy(values[1].files, ['name']).forEach(addFile);

  Fliplet.Widget.autosize();
}

function openOrganization(organizationId) {
  Promise.all([
    Fliplet.Media.Folders.get({ type: 'folders', organizationId: organizationId }),
    Fliplet.Media.Folders.get({ type: 'images', organizationId: organizationId })
  ])
    .then(function (values) {
      values[1].files = values[1].files.filter(function removeNonRootFiles(file) {
        return !(file.appId || file.mediaFolderId);
      });
      renderFolderContent(values);
    });
}

$('.image-library')
  .on('dblclick', '[data-folder-id]', function () {
    var $el = $(this);
    var id = $el.data('folder-id');
    var backItem;

    // Store to nav stack
    backItem = _.find(folders, ['id', id]);
    backItem.back = function () {
      openFolder(id);
    };
    backItem.type = 'folderId';
    upTo.push(backItem);

    // Open
    openFolder(id);

    $('.up-to').html($('.helper').text());
    $('.helper strong').html($el.find('.image-title').text());
  })
  .on('dblclick', '[data-app-id]', function () {
    var $el = $(this);
    var id = $el.data('app-id');
    var backItem;

    // Store to nav stack
    backItem = _.find(apps, ['id', id]);
    backItem.back = function () {
      openApp(id);
    };
    backItem.type = 'appId';
    upTo.push(backItem);

    // Open
    openApp(id);

    // Update paths
    updatePaths();
  })
  .on('dblclick', '[data-organization-id]', function () {
    var $el = $(this);
    var id = $el.data('organization-id');
    var backItem;

    // Store to nav stack
    backItem = _.find(organizations, ['id', id]);
    backItem.back = function () {
      openOrganization(id);
    };
    backItem.type = 'organizationId';
    upTo.push(backItem);

    // Open
    openOrganization(id);

    // Update paths
    updatePaths();
  })
  .on('click', '.image', function () {
    var $el = $(this);
    // Removes any selected folder
    $('.image').not(this).each(function(){
      $(this).removeClass('selected');
    });

    if ($el.hasClass('selected')) {
      $('.folder-selection span').html('Select an image below');
      selectedFileId = null;
    } else {
      $('.folder-selection span').html('You have selected an image');
      selectedFileId = $el.data('file-id');
    }

    $el.toggleClass('selected');
  });

$('.back-btn').click(function () {
  if (upTo.length === 1) {
    return;
  }

  upTo.pop();
  upTo[upTo.length-1].back();
  updatePaths();
});

function updatePaths() {
  if (upTo.length === 1) {
    // Hide them
    $('.gallery-tool').removeClass('with-tools');
    $('.back-btn').hide();
    $('.breadcrumbs-select').hide();

    return;
  }

  // Show them
  $('.gallery-tool').addClass('with-tools');
  $('.breadcrumbs-select').show();
  $('.back-btn').show();

  // Parent folder
  if (typeof upTo[upTo.length - 2].name !== 'undefined') {
    $('.up-to').html(upTo[upTo.length - 2].name);
  } else {
    $('.up-to').html("Root");
  }

  // Current folder
  $('.helper strong').html(upTo[upTo.length - 1].name);
}

// init
openRoot();

Fliplet.Widget.onSaveRequest(function () {
  var file = _.find(currentFiles, ['id', selectedFileId]);
  Fliplet.Widget.save(file).then(function () {
    Fliplet.Widget.complete();
  });
});
