const db = require('../firebase');
const { v4: uuidv4 } = require('uuid');

// Create a new supervisor
async function createSupervisor(supervisorData) {
    const supervisorId = uuidv4();
    const supervisor = {
        id: supervisorId,
        name: supervisorData.name,
        municipality: supervisorData.municipality,
        department: supervisorData.department,
        password: supervisorData.password, // In production, this should be hashed
        phoneNumber: supervisorData.phoneNumber,
        email: supervisorData.email,
        status: supervisorData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await db.collection('supervisors').doc(supervisorId).set(supervisor);
    return supervisorId;
}

// Get supervisors by municipality and department
async function getSupervisorsByMunicipalityAndDepartment(municipality, department) {
    const supervisorsRef = db.collection('supervisors');
    const snapshot = await supervisorsRef
        .where('municipality', '==', municipality)
        .where('department', '==', department)
        .where('status', '==', 'active')
        .get();

    const supervisors = [];
    snapshot.forEach(doc => {
        supervisors.push({ id: doc.id, ...doc.data() });
    });

    return supervisors;
}

// Get all supervisors
async function getAllSupervisors() {
    const supervisorsRef = db.collection('supervisors');
    const snapshot = await supervisorsRef.get();

    const supervisors = [];
    snapshot.forEach(doc => {
        supervisors.push({ id: doc.id, ...doc.data() });
    });

    return supervisors;
}

// Update supervisor status
async function updateSupervisorStatus(supervisorId, status) {
    await db.collection('supervisors').doc(supervisorId).update({
        status: status,
        updatedAt: new Date().toISOString()
    });
}

// Get supervisor by ID
async function getSupervisorById(supervisorId) {
    const doc = await db.collection('supervisors').doc(supervisorId).get();
    if (!doc.exists) {
        return null;
    }
    return { id: doc.id, ...doc.data() };
}

module.exports = {
    createSupervisor,
    getSupervisorsByMunicipalityAndDepartment,
    getAllSupervisors,
    updateSupervisorStatus,
    getSupervisorById
};
