const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\davif\\OneDrive\\Documentos\\sitema de rank atletas\\useStore_backup.js', 'utf8');
const match = content.match(/sourceMappingURL=data:application\/json;base64,(.+)$/);
if (match) {
    const base64 = match[1];
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    const sourceMap = JSON.parse(jsonStr);
    const originalContent = sourceMap.sourcesContent[0];
    fs.writeFileSync('C:\\Users\\davif\\OneDrive\\Documentos\\sitema de rank atletas\\src\\hooks\\useStore.js', originalContent);
    console.log("Successfully recovered useStore.js! Length:", originalContent.length);
} else {
    console.log("No source map found!");
}
