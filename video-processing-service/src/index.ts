import express, { Request, Response } from "express";
import { setupDirectories, downloadRawVideo, uploadProcessedVideo, convertVideo, deleteRawVideo, deleteProcessedVideo } from "./storage";

setupDirectories();

const app = express();
app.use(express.json());

app.post("/process-video", async (req: Request, res: Response): Promise<void> => {
  if (!req.body) {
    const msg = "No Pub/Sub message received";
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }
  if (!req.body.message) {
    const msg = "Invalid Pub/Sub message format";
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }
  if (!req.body.message.data) {
    const msg = "Invalid message payload received";
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }

  let inputFileName: string | undefined;
  let outputFileName: string | undefined;

  try {
    const message = Buffer.from(req.body.message.data, "base64").toString("utf-8");
    const data = JSON.parse(message);
    const inputFileName = data.name;
    const outputFileName = `processed-${inputFileName}`;

    // Download raw video from Cloud Storage
    await downloadRawVideo(inputFileName);

    // Convert the video to 360p and save to local storage
    await convertVideo(inputFileName, outputFileName);

    // Upload the processed video to Cloud Storage
    await uploadProcessedVideo(outputFileName);

    // Clean up local storage
    await Promise.all([deleteRawVideo(inputFileName), deleteProcessedVideo(outputFileName)]);

    res.status(200).send("Processing finished successfully");
    return;
  } catch (err) {
    console.error("Video processing failed:", err);

    try {
      if (inputFileName && outputFileName) {
        await Promise.all([deleteRawVideo(inputFileName), deleteProcessedVideo(outputFileName)]);
      }
    } catch (cleanupErr) {
      console.error("Cleanup failed:", cleanupErr);
    }

    res.status(500).send("Internal Server Error: video processing failed");
    return;
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Video processing service running at http://localhost:${port}`);
});
