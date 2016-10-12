var $imagesContainer = $('.image-library');
var templates = {
  file: template('file'),
  folder: template('folder'),
  app: template('app'),
  organization: template('organization'),
  noFiles: template('nofiles')
};

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

    if (currentAppId) options.appId = currentAppId;
    if (currentOrganizationId) options.organizationId = currentOrganizationId;
    if (currentFolderId) options.folderId = currentFolderId;

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
var currentAppId,
  currentOrganizationId,
  currentFolderId,
  folders,
  apps,
  organizations, 
  currentFiles;

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
  $('.helper').html('Root');
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
  $imagesContainer.html('');

  if (!values[0].folders.length && !values[1].files.length) {
    return noFiles();
  }
  folders = values[0].folders;
  currentFiles = values[1].files;

  // Render folders and files
  _.sortBy(values[0].folders, ['name']).forEach(addFolder);
  _.sortBy(values[1].files, ['name']).forEach(addFile);
}

function openOrganization(organizationId) {
  Promise.all([
    Fliplet.Media.Folders.get({ type: 'folders', organizationId: organizationId }),
    Fliplet.Media.Folders.get({ type: 'images', organizationId: organizationId })
  ])
    .then(function renderOrganization(values) {
      $imagesContainer.html('');

      // Render folders and files
      _.sortBy(values[0].folders, ['name']).forEach(addFolder);
      _.sortBy(values[1].files, ['name']).forEach(addFile);
    });
}

$('.image-library')
  .on('dblclick', '[data-folder-id]', function () {
    var $el = $(this);
    var folderId = $el.data('folder-id');
    var parentId = $el.data('parent-id');
    var backItem;

    if (parentId === '' && currentAppId) {
      backItem = _.find(apps, ['id', currentAppId]);
      backItem.back = function () {
        openApp(backItem.id);
      };
      upTo.push(backItem);
    } else if (parentId === '' && currentOrganizationId) {
      backItem = _.find(organizations, ['id', currentOrganizationId]);
      backItem.back = function () {
        openOrganization(backItem.id);
      };
      upTo.push(backItem);
    } else if (parentId !== '') {
      backItem = _.find(folders, ['id', folderId]);
      backItem.back = function () {
        openFolder(backItem.id);
      };
      upTo.push(backItem);
    }

    currentFolderId = folderId;
    currentAppId = undefined;
    currentOrganizationId = undefined;

    openFolder(folderId);

    $('.up-to').html($('.helper').text());
    $('.helper').html($el.find('.image-title').text());
  })
  .on('click', '[data-file-file]', function () {
    var $el = $(this);
    var id = $el.data('file-id');
  })
  .on('dblclick', '[data-app-id]', function () {
    var $el = $(this);
    var id = $el.data('app-id');
    currentAppId = id;
    currentOrganizationId = undefined;
    currentFolderId = undefined;
    openApp(id);

    // Update paths
    $('.helper').html($el.find('.image-title').text());
    $('.up-to').html('Root');
    $('.back-btn').show();
  })
  .on('dblclick', '[data-organization-id]', function () {
    var $el = $(this);
    var id = $el.data('organization-id');
    currentOrganizationId = id;
    currentAppId = undefined;
    currentFolderId = undefined;
    openOrganization(id);

    // Update paths
    $('.helper').html($el.find('.image-title').text());
    $('.up-to').html('Root');
    $('.back-btn').show();
  })
  .on('click', '.image', function (event) {
    // Removes any selected folder
    $('.image').not(this).each(function(){
      $(this).removeClass('selected');
    });

    // Selects clicked folder or deselects clicked folder
    $(this).toggleClass('selected');
  })
  .on('click', '[data-select-file]', function (event) {
    event.preventDefault();
    var id = $(this).parents('.image').data('file-id');
    currentFiles.forEach(function (file) {
      if (file.id === id) {
        Fliplet.Wdget.save(file).then(function () {
          Fliplet.Widget.complete();
        });
      }
    })
  });


$('.back-btn').click(function () {
  var $el = $(this);
  var id = $el.data('file-id');

  $('.helper').html($('.up-to').text());

  if (upTo.length === 1) {
    $('.back-btn').hide();
    return upTo[0].back();
  }

  var upToText = upTo[upTo.length - 2].name ? upTo[upTo.length - 2].name : 'Root';
  $('.up-to').html(upToText);
  return upTo.pop().back();
});

// init
openRoot();
