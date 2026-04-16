// src/lib/taxonomy.ts

export const INTEREST_BUCKETS: Record<string, string[]> = {
  "Education & Youth": [
    "Pedagogy & Curriculum",
    "Student Engagement",
    "Service Learning",
    "Mentorship",
    "College & Career Pathways",
    "Youth Development",
    "Civic Education"
  ],
  "Justice & Government": [
    "Public Policy",
    "Human Rights",
    "Criminal Justice Reform",
    "Social Justice",
    "Legal Advocacy",
    "Democracy & Voting"
  ],
  "Health & Wellness": [
    "Public Health",
    "Mental Health & Wellness",
    "Health Equity",
    "Food Security",
    "Disability Support",
    "Healthcare Pathways"
  ],
  "Community & Civic Engagement": [
    "Community Outreach",
    "Civic Engagement",
    "Volunteerism",
    "Immigrant Services",
    "Urban Planning",
    "Civic Leadership",
    "Diversity & Inclusion"
  ],
  "Economic & Workforce": [
    "Workforce Development",
    "Career Development",
    "Economic Development",
    "Financial Empowerment",
    "Entrepreneurship",
    "Labor Rights"
  ],
  "Arts & Media": [
    "Digital Media & Journalism",
    "Performing Arts",
    "Visual Arts",
    "Civic Storytelling",
    "Public Communication"
  ],
  "Environment & Sustainability": [
    "Sustainability",
    "Climate Justice",
    "Environmental Engineering",
    "Ecology"
  ],
  "Tech & Data": [
    "Data Science & Analytics",
    "Civic Tech",
    "AI & Machine Learning",
    "Cybersecurity",
    "IT Workforce Training",
    "Computer Science"
  ],
  "Research & Evaluation": [
    "Academic & Policy Research",
    "Program Evaluation",
    "Community-Based Research",
    "Data Collection & Analysis",
    "STEM Research"
  ]
};

// A flat array of all granular tags, useful for strict validation
export const ALL_GRANULAR_TAGS = Object.values(INTEREST_BUCKETS).flat();