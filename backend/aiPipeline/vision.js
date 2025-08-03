const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios=require('axios')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function vision(imageBuffer) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });
  const result = await model.generateContent([
    { text: 'Analyze the image to detect ACTUAL MAINTENANCE PROBLEMS or FAULTS. Only classify as an issue if you see clear signs of damage, malfunction, or problems that need repair:\n\n- plumbing: ONLY if you see leaking pipes, broken faucets, clogged drains, water damage, or plumbing malfunctions\n- electrical: ONLY if you see damaged wires, broken outlets, sparking, electrical hazards, or malfunctioning electrical equipment\n- civil: ONLY if you see cracks in walls/roads, structural damage, broken infrastructure, or construction defects\n- none: If the image shows normal/working infrastructure, random objects, people, food, or no clear maintenance problem\n\nDo NOT classify working appliances, normal construction, or functional infrastructure as issues. Only respond with the category if there is a clear problem that needs fixing.' },
    {
      inlineData: {
        mimeType: 'image/png',
        data: imageBuffer.toString('base64'),
      },
    },
  ]);

  const response = await result.response;
  const category = response.text().trim().toLowerCase();

  if (category.includes('none') || category.includes('no issue') || category.includes('not an issue')) {
    return 'none';
  }

  return category;
}

module.exports={vision}




