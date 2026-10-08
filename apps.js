const folderHandle = await window.showDirectoryPicker();

const fileHandle = await folderHandle.getFileHandle(
  "app.js",
  { create: true }
);

const writable = await fileHandle.createWritable();

await writable.write(
`console.log("Hello CodeNova");`
);

await writable.close();