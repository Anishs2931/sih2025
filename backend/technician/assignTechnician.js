const db = require("../firebase");
const { getETA } = require("./maps");

async function assignTechnician(taskId, issueType, userLocation) {
  const techsSnapshot = await db.collection("technicians")
    .where("status", "==", "available")
    .get();

  let bestTech = null;
  let minETA = Infinity;

  for (const doc of techsSnapshot.docs) {
    const tech = doc.data();
    if (!tech.skills.includes(issueType)) continue;

    const techLoc = `${tech.location.lat},${tech.location.lng}`;
    const eta = await getETA(techLoc, userLocation);
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
    return {
      assigned: true,
      technicianId: bestTech.id,
      eta_seconds: minETA
    };
  } else {
    await db.collection("tasks").doc(taskId).update({
      status: "Pending"
    });
    return { assigned: false };
  }
}

module.exports = { assignTechnician };
