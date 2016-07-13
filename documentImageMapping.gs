/**
 * Description: 
 * A Google Sheets script to find the Google Drive location of all images in the
 * specified document(s) and write the results to a sheet. All images must be 
 * InlineImages (i.e., text wrapping is set to "In line"), and documents must be
 * in the top level of the chosen folder.
 *
 * Authors: Kyle Crouse (kacrouse) and Josh Williams
 *
 * TO USE THIS SCRIPT:
 * 1. Attach the script to a Google Sheet by opening a sheet and clicking Tools >
 * Script Editor..., then paste in this script.
 * 2. Set IMAGE_FOLDER_ID to the ID of the folder containing the source images.
 * 3. Set DOCUMENT_FOLDER_ID to the ID of the folder containing the documents for
 * which to map the images.
 * IDs can be found at the end of a folder's shareable link, after the text "id=".
 * 4. Set CAPTION_LOCATION to the location of captions in respect to images.
 * 5. Click 'main' in the Select function dropdown.
 * 6. Click Run.
 */
var IMAGE_FOLDER_ID = "INSERT IMAGE FOLDER ID"; 
var DOCUMENT_FOLDER_ID = "INSERT DOC FOLDER ID";
var CAPTION_LOCATION = "ABOVE"; // or "BELOW"
var driveImages = null;

function main() {
  // Doc Images Folder
  var imageFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  if (imageFolder === undefined) {
    throw "Image folder not found.";
  }
  driveImages = getDriveImagePaths(imageFolder);

  // Documents Folder
  var docFolder = DriveApp.getFolderById(DOCUMENT_FOLDER_ID);
  if (docFolder === undefined) {
    throw "Document folder not found.";
  }
  var documentImageMappings = [];
  var docs = docFolder.getFiles();
  while (docs.hasNext()) {
    var doc = DocumentApp.openById(docs.next().getId());
    if (doc === undefined) {
      continue;
    }
    var mapping = mapDocumentImages(doc);
    documentImageMappings.push(mapping);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.insertSheet(Utilities.formatString("Folder: %s @ %s", 
    docFolder.getName(),
    Utilities.formatDate(new Date(), 'CST', "h:mm a, d MMM yyyy")));
  
  // write headers
  sheet.appendRow(['Filename', 'Drive Location', 'Document', 'Caption']);
  // freeze header row
  sheet.setFrozenRows(1);
  
  // write mappings to sheet
  documentImageMappings.map(function(docMap) {
    docMap.mappedImages.map(function(imageMap) {
      sheet.appendRow(buildSheetRow(imageMap, docMap.document));
    });
  });
  
  // auto resize all columns
  sheet.autoResizeColumn(1)
    .autoResizeColumn(2)
    .autoResizeColumn(3)
    .autoResizeColumn(4);
}

// Get the path and parent folder of all files in imageFolder (recursive)
function getDriveImagePaths(imageFolder) {
  var paths = [];
  getDriveImagePathsHelper(imageFolder, imageFolder.getName(), paths);
  return paths;
}

function getDriveImagePathsHelper(folder, path, pathStore) {
  var subFolders = folder.getFolders();
  var subFiles = folder.getFiles();

  if (subFiles !== undefined) {
    while (subFiles.hasNext()) {
      var currentFile = subFiles.next();
      pathStore[currentFile.getName()] = {
        path: path,
        file: currentFile,
        parentFolder: folder
      };
    }
  }

  if (subFolders !== undefined) {
    while (subFolders.hasNext()) {
      var currentFolder = subFolders.next();
      getDriveImagePathsHelper(currentFolder,
        path + '/' + currentFolder.getName(),
        pathStore);
    }
  }
}

function mapDocumentImages(document) {
  var images = document.getBody().getImages();
  return {
    document: document,
    mappedImages: images.map(mapDocImage)
  };
}

// Links a document image to its source Drive file
// and returns an object with the resulting data
function mapDocImage(image) {
  var filename = image.getAltDescription();
  var file;
  var folder;
  var path;
  if (filename in driveImages) {
    file = driveImages[filename].file;
    path = driveImages[filename].path;
    folder = driveImages[filename].parentFolder;
  }
  return {
    filename: filename || 'FILE NOT FOUND',
    driveFile: file || 'FILE NOT FOUND',
    driveFolder: folder || 'FILE NOT FOUND',
    drivePath: path || 'FILE NOT FOUND',
    docCaption: findImageCaption(image) || 'CAPTION NOT FOUND'
  };
}

function findImageCaption(image) {
  var captionEl;
  if (CAPTION_LOCATION === 'ABOVE') {
    captionEl = image.getParent().getPreviousSibling();
  } else if (CAPTION_LOCATION === 'BELOW') {
    captionEl = image.getParent().getNextSibling();
  } else {
    throw "Invalid value defined for CAPTION_LOCATION";
  }

  if (captionEl.getType() != DocumentApp.ElementType.PARAGRAPH) {
    return undefined;
  }
  var caption = captionEl.asParagraph().getText().trim();
  if (caption.substring(0, 3) != 'Fig') {
    return undefined;
  }
  return caption;
}

function getLinkString(url, text) {
  return Utilities.formatString('=HYPERLINK(\"%s\",\"%s\")', url, text);
}

function buildSheetRow(imageMap, document) {
  try {
    var filename = getLinkString(imageMap.driveFile.getUrl(), imageMap.filename);
  } catch (e) {
    var filename = imageMap.filename;
  }
  
  try {
    var path = getLinkString(imageMap.driveFolder.getUrl(), imageMap.drivePath);
  } catch (e) {
    var path = imageMap.drivePath;
  }
  
  try {
    var docName = getLinkString(docMap.document.getUrl(), docMap.document.getName());
  } catch (e) {
    var docName = document.getName(); 
  }

  return [filename, path, docName, imageMap.docCaption];
}
