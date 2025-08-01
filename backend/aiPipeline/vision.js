const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios=require('axios')

const genAI = new GoogleGenerativeAI("AIzaSyAVKUIClnubulxAFWV8FAYNHN2OzPDPjGI");

async function loadImageBytes(imagePathOrUrl) {
  if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {

    const response = await axios.get(imagePathOrUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } else {
    return fs.readFileSync(path.resolve(imagePathOrUrl));
  }
}

async function run() {
 const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const imagePathOrUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSR51C-pKBRv68ZrVPkVt3QD_9DY-kG7YFTcg&s';
  const imageBytes = await loadImageBytes(imagePathOrUrl);

  const result = await model.generateContent([
    { text: 'Given the image, classify the type of community issue: - plumbing - electrical - civil - none Just output the category.' },
    {
      inlineData: {
        mimeType: 'image/png',
        data: imageBytes.toString('base64'),
      },
    },
  ]);

  const response = await result.response;
  console.log(response.text());
}

run().catch(console.error);
