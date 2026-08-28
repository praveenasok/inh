const fs = require('fs');
const clients = JSON.parse(fs.readFileSync('data/clients.json', 'utf8'));
const FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

clients.forEach(client => {
    console.log("Client:", client.name);
    let active = [];
    FINISHED_LENGTHS.forEach((len, idx) => {
        const matrixKey = client.matrix[len] ? len : (client.matrix[idx] ? idx : null);
        if (matrixKey !== null) active.push(len);
    });
    console.log("Active lengths:", active.join(", "));
});
