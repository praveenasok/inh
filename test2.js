const fs = require('fs');
const clients = JSON.parse(fs.readFileSync('data/clients.json', 'utf8'));
const FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

clients.forEach(client => {
    let active = [];
    FINISHED_LENGTHS.forEach((len, idx) => {
        const matrixKey = client.matrix[len] ? len : (client.matrix[idx] ? idx : null);
        const rowData = matrixKey !== null ? client.matrix[matrixKey] : undefined;
        if (rowData) {
            const hasValue = Object.values(rowData).some(val => val > 0);
            if (hasValue) {
                active.push(len);
            }
        }
    });
    console.log(`Client: ${client.name} | Active: ${active.join(',')}`);
});
