// Standardized departments for municipal issues
const DEPARTMENTS = {
    ELECTRICAL: 'electrical',
    WATER: 'water', 
    INFRASTRUCTURE: 'infrastructure',
    SANITATION: 'sanitation',
    ENVIRONMENT: 'environment',
    SECURITY: 'security',
    GENERAL: 'general'
};

// Map issue types to departments
function getIssueDepartment(issueType) {
    const issueLower = issueType.toLowerCase();
    
    // Electrical issues
    if (issueLower.includes('electrical') || 
        issueLower.includes('power') || 
        issueLower.includes('electricity') || 
        issueLower.includes('wiring') ||
        issueLower.includes('cable') ||
        issueLower.includes('light') ||
        issueLower.includes('street light') ||
        issueLower.includes('lamp') ||
        issueLower.includes('electric')) {
        return DEPARTMENTS.ELECTRICAL;
    }
    
    // Water/Plumbing issues
    if (issueLower.includes('water') || 
        issueLower.includes('plumbing') || 
        issueLower.includes('drainage') || 
        issueLower.includes('sewage') ||
        issueLower.includes('pipe') ||
        issueLower.includes('leak') ||
        issueLower.includes('tap') ||
        issueLower.includes('toilet') ||
        issueLower.includes('drain')) {
        return DEPARTMENTS.WATER;
    }
    
    // Infrastructure issues (including civil engineering)
    if (issueLower.includes('road') || 
        issueLower.includes('pothole') || 
        issueLower.includes('pavement') || 
        issueLower.includes('street') ||
        issueLower.includes('construction') ||
        issueLower.includes('bridge') ||
        issueLower.includes('sidewalk') ||
        issueLower.includes('traffic') ||
        issueLower.includes('civil') ||
        issueLower.includes('structure') ||
        issueLower.includes('building') ||
        issueLower.includes('crack') ||
        issueLower.includes('concrete') ||
        issueLower.includes('asphalt')) {
        return DEPARTMENTS.INFRASTRUCTURE;
    }
    
    // Waste Management issues
    if (issueLower.includes('garbage') || 
        issueLower.includes('waste') || 
        issueLower.includes('trash') || 
        issueLower.includes('sanitation') ||
        issueLower.includes('cleaning') ||
        issueLower.includes('dustbin') ||
        issueLower.includes('litter')) {
        return DEPARTMENTS.SANITATION;
    }
    
    // Environmental issues
    if (issueLower.includes('tree') || 
        issueLower.includes('garden') || 
        issueLower.includes('park') || 
        issueLower.includes('environment') ||
        issueLower.includes('pollution') ||
        issueLower.includes('noise') ||
        issueLower.includes('air quality')) {
        return DEPARTMENTS.ENVIRONMENT;
    }
    
    // Security issues
    if (issueLower.includes('security') || 
        issueLower.includes('safety') || 
        issueLower.includes('crime') || 
        issueLower.includes('vandalism') ||
        issueLower.includes('theft') ||
        issueLower.includes('violence')) {
        return DEPARTMENTS.SECURITY;
    }
    
    // Default to general maintenance
    return DEPARTMENTS.GENERAL;
}

module.exports = {
    getIssueDepartment,
    DEPARTMENTS
};
