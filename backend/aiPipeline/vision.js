const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios=require('axios')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function loadImageBytes(imagePathOrUrl) {
  if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {

    const response = await axios.get(imagePathOrUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } else {
    return fs.readFileSync(path.resolve(imagePathOrUrl));
  }
}

async function vision(imageBuffer) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });
  const result = await model.generateContent([
    { text: 'Given the image, classify the type of community issue: - plumbing - electrical - civil - none Just output the category.' },
    {
      inlineData: {
        mimeType: 'image/png',
        data: imageBuffer.toString('base64'),
      },
    },
  ]);

  const response = await result.response;
  return response.text();
}

module.exports={vision}




