const db = require("./firebase");

async function seedData() {
  // Sample technician documents
  const technicians = [
    {
      name: "Raj",
      status: "available",
      skills: ["AC Repair", "Plumbing"],
      location: { lat: 17.4371, lng: 78.4485 }
    },
    {
      name: "Priya",
      status: "available",
      skills: ["Electrician", "AC Repair"],
      location: { lat: 17.4359, lng: 78.4470 }
    },
    {
      name: "Manoj",
      status: "busy",
      skills: ["Carpentry"],
      location: { lat: 17.4320, lng: 78.4410 }
    }
  ];

  // Sample task document
  const task = {
    issueType: "AC Repair",
    userLocation: "17.4375,78.4483",
    status: "Reported",
    assigned_technician: null
  };

  try {
    // Add technicians
    for (const tech of technicians) {
      await db.collection("technicians").add(tech);
    }

    // Add one sample task with ID "abc123"
    await db.collection("tasks").doc("abc123").set(task);

    console.log("🔥 Mock data inserted successfully!");
  } catch (err) {
    console.error("❌ Error seeding mock data:", err);
  }
}

seedData();
