const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const prompt = require("prompt-sync")();

const resizedPath = "./images/resized/"; // specify the output folder
const maxSizeInMb = 0.9; // Specify file size in Mb
const longEdgeTargetSize = 2500; // type the length of the long edge in pixels

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

// Swap the original file extension with jpeg
const generateFileName = (fileName, sequence) => {
  const newName = fileName.split(".")[0] + "-" + sequence + ".jpeg";
  return newName;
};

// Resize image and save - checks if the newly created file is still over the limit, and recursively modifies it, making smaller and smaller
async function resizeImage(imagePath, fileName, size, sequence = 1) {
  const metadata = await sharp(imagePath).metadata();
  const longEdge = metadata.width > metadata.height ? "width" : "height";
  const outputPath = path.resolve(resizedPath, generateFileName(fileName, sequence));

  try {
    await sharp(imagePath)
      .resize({
        [longEdge]: size,
      })
      .toFormat("jpeg")
      .jpeg({ quality: 90, force: true })
      .toFile(outputPath);

    console.log("Image resized, original: ", fileName);
    // re-check if new size is over the limit
    const isLarge = isSizeGreaterThanLimit(outputPath, maxSizeInMb);
    if (isLarge) {
      sequence += 1;
      size -= 500;
      await resizeImage(outputPath, fileName, size, sequence);
      const prevFile = outputPath.split("."[0] + "-" + sequence - 1 + ".jpeg")[0];
      console.log("delete old file", prevFile);
      await fs.unlink(prevFile, (error) => {
        if (error) {
          console.log(`Failed to delete the original file: ${error}`);
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
}

async function iteration(folderPath) {
  const filesToProcess = fs.readdirSync(folderPath).filter((file) => !file.startsWith("."));

  for (const file of filesToProcess) {
    const imagePath = path.resolve(folderPath, file);
    const isLarge = isSizeGreaterThanLimit(imagePath, maxSizeInMb);

    if (isLarge) {
      const resizedImageFileName = generateFileName(file, 1);
      const resizedImagePath = path.resolve(resizedPath, resizedImageFileName);
      if (!fs.existsSync(resizedImagePath)) {
        await resizeImage(imagePath, file, longEdgeTargetSize);
      }
    }
  }
}

// input absolute path to folder - if left empty, iterates through the images folder of this project
const pathToImages = prompt("Please enter absolute path to the images folder, or leave empty for default images folder os this project:", "images");
iteration(pathToImages).catch((error) => {
  console.log(`An error occurred: ${error}`);
});
