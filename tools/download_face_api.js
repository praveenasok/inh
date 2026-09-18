const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'models');
const jsDir = path.join(__dirname, '..', 'js');

if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir);
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);

const repoRawUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master';

const filesToDownload = [
    { url: `${repoRawUrl}/dist/face-api.min.js`, dest: path.join(jsDir, 'face-api.min.js') },
    
    // SSD Mobilenet V1 (Face Detection)
    { url: `${repoRawUrl}/weights/ssd_mobilenetv1_model-weights_manifest.json`, dest: path.join(modelsDir, 'ssd_mobilenetv1_model-weights_manifest.json') },
    { url: `${repoRawUrl}/weights/ssd_mobilenetv1_model-shard1`, dest: path.join(modelsDir, 'ssd_mobilenetv1_model-shard1') },
    { url: `${repoRawUrl}/weights/ssd_mobilenetv1_model-shard2`, dest: path.join(modelsDir, 'ssd_mobilenetv1_model-shard2') },
    
    // Face Landmark 68 (Feature Extraction)
    { url: `${repoRawUrl}/weights/face_landmark_68_model-weights_manifest.json`, dest: path.join(modelsDir, 'face_landmark_68_model-weights_manifest.json') },
    { url: `${repoRawUrl}/weights/face_landmark_68_model-shard1`, dest: path.join(modelsDir, 'face_landmark_68_model-shard1') },
    
    // Face Recognition (128d vector)
    { url: `${repoRawUrl}/weights/face_recognition_model-weights_manifest.json`, dest: path.join(modelsDir, 'face_recognition_model-weights_manifest.json') },
    { url: `${repoRawUrl}/weights/face_recognition_model-shard1`, dest: path.join(modelsDir, 'face_recognition_model-shard1') },
    { url: `${repoRawUrl}/weights/face_recognition_model-shard2`, dest: path.join(modelsDir, 'face_recognition_model-shard2') },
];

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function run() {
    console.log('Downloading face-api.js and models...');
    for (const file of filesToDownload) {
        console.log(`Downloading ${path.basename(file.dest)}...`);
        try {
            await downloadFile(file.url, file.dest);
            console.log(`Successfully downloaded ${path.basename(file.dest)}`);
        } catch (e) {
            console.error(`Error downloading ${file.url}:`, e);
        }
    }
    console.log('Done!');
}

run();
