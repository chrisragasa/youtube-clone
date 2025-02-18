import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const storage = new Storage();

const rawVideoBucketName = "cr-raw-bucket-videos";
const processedVideoBucketName = "cr-processed-bucket-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

// create local directories for raw and processed videos
export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

// process a video and make it 360p and save it to local storage
export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360")
      .on("end", () => {
        console.log(`Processing complete: ${localRawVideoPath}/${rawVideoName}`);
        resolve();
      })
      .on("error", (err) => {
        console.log(`Error occured while processing: ${localRawVideoPath}/${rawVideoName}`);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

export async function downloadRawVideo(fileName: string) {
  await storage
    .bucket(rawVideoBucketName)
    .file(fileName)
    .download({ destination: `${localRawVideoPath}/${fileName}` });
  console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}`);
}

export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);

  await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
    destination: fileName,
  });
  console.log(`The local video from ${localProcessedVideoPath}/${fileName} has been uploaded to GCS bucket ${processedVideoBucketName}`);

  await bucket.file(fileName).makePublic();
}

export function deleteRawVideo(filePath: string) {
  return deleteFile(`${localRawVideoPath}/${filePath}`);
}

export function deleteProcessedVideo(filePath: string) {
  return deleteFile(`${localProcessedVideoPath}/${filePath}`);
}

function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(`Failed to delete ${filePath}`, err);
          reject(err);
        } else {
          console.log(`Succesfully deleted ${filePath}`);
          resolve();
        }
      });
    } else {
      reject(`The ${filePath} does not exist in local storage.`);
    }
  });
}

function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created at ${dirPath}`);
  } else {
    console.log(`${dirPath} directory exists.`);
  }
}
