var $imagesContainer = $('.image-library');
var templates = {};

[
  'app',
  'file',
  'folder',
  'organization',
  'noFiles'
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
  .on('submit', '[data-upload-file]', function uploadImage(event) {
    var $form = $(this);
    event.preventDefault();

    var $input = $form.find('input');
    var file = $input[0].files[0];
    var formData = new FormData();

    formData.append('name', file.name);
    formData.append('file', file);

    var options = {
      name: file.name,
      data: formData
    };

    if (upTo[upTo.length - 1].type) {
      options[upTo[upTo.length - 1].type] = upTo[upTo.length - 1].id;
    }

    Fliplet.Media.Files.upload(options).then(function (files) {
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
    ])
    .then(function renderRoot(values) {
      organizations = values[0];
      apps = values[1];

      values[0].forEach(addOrganization);
      values[1].forEach(addApp)
    })

  Fliplet.Widget.autosize();
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
    .then(renderFolderContent);
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
