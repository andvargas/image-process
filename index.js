const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const resizedPath = "./images/resized/";
const maxSizeInMb = 0.9; // Specify threshold

// Helper function to convert bytes to megabytes
const convertToMb = (bytes) => bytes / (1024 * 1024);

// If folder doesn't exist, create it.
if (!fs.existsSync(resizedPath)) {
  fs.mkdirSync(resizedPath);
}

// Check if image size is greater than the specified limit
function isSizeGreaterThanLimit(imagePath, limitInMb) {
  const stats = fs.statSync(imagePath);
  const sizeInMb = convertToMb(stats.size);
  return sizeInMb > limitInMb;
}

// Resize image and save
async function resizeImage(imagePath, fileName, size) {
  const metadata = await sharp(imagePath).metadata();
  const longEdge = metadata.width > metadata.height ? "width" : "height";
  let outputPath = `${resizedPath + "resized-" + fileName}`;
  let toDeletePath;
  if (fs.existsSync(outputPath)) {
    outputPath = `${resizedPath + "resized2-" + fileName}`;
    toDeletePath = `${resizedPath + "resized-" + fileName}`;
  }
  try {
    await sharp(imagePath)
      .resize({
        [longEdge]: size,
      })
      .toFile(outputPath);
    //here i delete the original file when is being processed twice
    if (toDeletePath) {
      fs.unlink(`${resizedPath + "resized-" + fileName}`, (error) => {
        if (error) {
          console.log(`Failed to delete the original file: ${error}`);
        } else {
          console.log(`Re-processed initial file ${toDeletePath} deleted successfully.`);
        }
      });
      console.log("Image re-processed", fileName);
    }
  } catch (error) {
    console.log(error);
  }
}

// Check if new imagesize is still > 6Mb
const recheck = (fileName) => {
  const filePath = path.resolve(resizedPath, "resized-" + fileName);
  const isLarge = isSizeGreaterThanLimit(filePath, maxSizeInMb);
  isLarge ? resizeImage(filePath, fileName, 2000) : null;
};

// Process image
async function processImage(imagePath, fileName) {
  try {
    const metadata = await sharp(imagePath).metadata();
    await resizeImage(imagePath, fileName, 2500);
    recheck(fileName);
    console.log("Image processed: ", fileName);
  } catch (error) {
    console.log(`An error occurred during processing: ${error}`);
  }
}

function iteration(pathName) {
  const results = pathName;
  const filtered = results.filter((res) => {
    return res !== ".DS_Store";
  });

  filtered.forEach((file) => {
    const img = fs.lstatSync(path.resolve("images", file));
    const isLarge = isSizeGreaterThanLimit(path.resolve("images", file), maxSizeInMb);
    if (isLarge) {
      processImage(path.resolve("images", file), file);
    }
  });
}

iteration(fs.readdirSync(path.resolve(__dirname, "images")));
