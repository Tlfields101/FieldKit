import { Router } from 'express';
import fs from "fs";
import path from "path";

const router = Router();

function walkDirRecursive(dir: string, supportedExtensions: RegExp): string[] {
    let results: string [] = [];

    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of list) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(walkDirRecursive(fullPath, supportedExtensions));
        } else if (supportedExtensions.test(entry.name)) {
            results.push(fullPath);
        }
    }

    return results;
}

router.post("/api/assets-from-path", (req, res) => {
    const folderPath = req.body.folder;

    if (!folderPath || typeof folderPath !== "string") {
        return res.status(400).json({ message: "Missing or Invalid Folder" });
    }

    //Log Scanning Folders
    console.log(`Scanning folder: ${folderPath}`);

    try{
        const supportedExtensions = /\.(blend|glb|gltf|fbx|obj)$/i;
        const matchedFiles = walkDirRecursive(folderPath, supportedExtensions);

        const assets = matchedFiles.map(fullPath => ({
                name: path.basename(fullPath),
                type: path.extname(fullPath).slice(1),
                fullpath: fullPath,
        }));

        console.log(`✅ Found ${assets.length} asset(s)`);

        res.json({ assets });
    } catch (err: any) {
        console.error(`❌ Error scanning folder: ${err.message}`);
        res.status(500).json({ error: `Failed to scan folder: ${err.message}` });
    }
});

export default router;