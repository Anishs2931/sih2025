const db = require("../firebase");
const { getETA } = require("./maps");

async function assignTechnician(taskId, category, location) {


  const techsSnapshot = await db.collection("technicians")
    .where("status", "==", "available")
    .get();

  let bestTech = null;
  let minETA = Infinity;

category = category.trim().toLowerCase();
let issueType = "";

if (category === "electrical") {
  issueType = "Electrician";
} else if (category === "plumbing") {
  issueType = "Plumber";
} else if (category === "civil") {
  issueType = "Mason";
} else if (category === "painting") {
  issueType = "Painter";
} else if (category === "carpentry") {
  issueType = "Carpenter";
} else if (category === "welding") {
  issueType = "Welder";
} else if (category === "tiling") {
  issueType = "Tiler";
} else if (category === "roofing") {
  issueType = "Roofer";
} else if (category === "landscaping") {
  issueType = "Gardener";
} else if (category === "cleaning") {
  issueType = "Cleaner";
} else if (category === "hvac") {
  issueType = "Technician";
} else if (category === "glasswork") {
  issueType = "Glazier";
} else {
  issueType = "Unknown";
}

  for (const doc of techsSnapshot.docs) {
    const tech = doc.data();
    if (tech.job!==issueType) continue;

    const techLoc = `${tech.location.lat},${tech.location.lng}`;
    const loc=`${location.lat},${location.lng}`
    const eta = await getETA(techLoc, loc);
    if (eta < minETA) {
      minETA = eta;
      bestTech = { id: doc.id, ...tech };
    }
  }

  if (bestTech) {
    await db.collection("tasks").doc(taskId).update({
      status: "Assigned",
      assigned_technician: bestTech.id
    });
    // Fetch technician details for response
    const techDoc = await db.collection("technicians").doc(bestTech.id).get();
    const techDetails = techDoc.exists ? techDoc.data() : null;
    return {
      assigned: true,
      technicianId: bestTech.id,
      eta_seconds: minETA,
      technicianDetails: techDetails ? {
        name: techDetails.name || '',
        phone: techDetails.phone || '',
        email: techDetails.email || ''
      } : null
    };
  } else {
    await db.collection("tasks").doc(taskId).update({
      status: "Pending"
    });

    return { assigned: false };
  }
}

module.exports = { assignTechnician };
