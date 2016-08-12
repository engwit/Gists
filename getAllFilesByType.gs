/**
 * Recurses through the Drive Folder driveFolder finding all files of the 
 * MIME Types specified by mimeTypes and returns the resulting array. 
 * If mimeTypes is an empty array, files of all types are returned.
 * 
 * @author Kyle Crouse <kacrouse>
 * 
 * @param {Folder} driveFolder - the folder to look for files in. 
 * See https://developers.google.com/apps-script/reference/drive/folder for reference.
 * @param {string[]} mimeTypes - the file types to look for.
 * See https://developers.google.com/apps-script/reference/base/mime-type for options.
 * @returns {File[]} the files of the specified types found in the folder.
 * See https://developers.google.com/apps-script/reference/drive/file for reference.
 */
function getAllFilesByType(driveFolder, mimeTypes) {
  if (!Array.isArray(mimeTypes)) {
    throw "mimeTypes must be an array.";
  }
  
  if (!(typeof driveFolder.getFiles === 'function')) {
    throw "driveFolder must be a Folder object."; 
  }

  var targetFiles = [];
  getAllFilesByTypeHelper(driveFolder, mimeTypes, targetFiles);
  Logger.log(targetFiles);
  return targetFiles;
}

function getAllFilesByTypeHelper(folder, mimeTypes, targetFiles) {
  // get files of all specified types in folder
  if (mimeTypes.length > 0) {
    mimeTypes.reduce(function (prev, curr) {
      var files = folder.getFilesByType(curr);
      while (files.hasNext()) {
        prev.push(files.next());  
      }
      return prev;
    }, targetFiles);
  } else {
    var files = folder.getFiles();
    while (files.hasNext()) {
      targetFiles.push(files.next());
    }
  }
  
  // recurse through each child folder in folder
  var folders = folder.getFolders();
  while (folders.hasNext()) {
    getAllFilesByTypeHelper(folders.next(), mimeTypes, targetFiles);
  }
}
