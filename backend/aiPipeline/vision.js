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
    { text: 'Analyze the image to detect ACTUAL MUNICIPAL ISSUES that need immediate attention. Only classify as an issue if you see clear signs of damage, malfunction, or problems that require municipal intervention:\n\n- electrical: Damaged power lines, broken street lights, electrical cables hanging, sparking wires, non-functioning electrical equipment, transformer issues\n- water: Leaking pipes, water main breaks, flooding, drainage blockages, sewage overflow, broken taps, plumbing failures\n- infrastructure: Potholes, road cracks, damaged pavements, broken bridges, structural damage to buildings, traffic sign damage, civil engineering problems\n- sanitation: Garbage accumulation, overflowing dustbins, waste on streets, unhygienic conditions, cleaning issues\n- environment: Fallen trees, damaged parks, pollution, environmental hazards, tree maintenance issues\n- security: Vandalism, damaged public property, safety hazards, security concerns\n- general: Other municipal maintenance issues that don\'t fit above categories\n- none: If no municipal issue is visible (normal infrastructure, people, food, working equipment)\n\nOnly respond with ONE category name. Be specific - use appropriate category instead of defaulting to general.' },
    {
      inlineData: {
        mimeType: 'image/png',
        data: imageBuffer.toString('base64'),
      },
    },
  ]);

  const response = await result.response;
  const category = response.text().trim().toLowerCase();

  // List of valid categories
  const validCategories = ['electrical', 'water', 'infrastructure', 'sanitation', 'environment', 'security', 'general'];
  
  if (category.includes('none') || category.includes('no issue') || category.includes('not an issue')) {
    return 'none';
  }

  // Check for valid categories in the response
  for (const validCategory of validCategories) {
    if (category.includes(validCategory)) {
      return validCategory;
    }
  }

  // Legacy support for old categories
  if (category.includes('plumbing')) {
    return 'water';
  }
  if (category.includes('civil')) {
    return 'infrastructure';
  }

  // Default to general if no specific category found but an issue is detected
  return 'general';
}

module.exports={vision}




