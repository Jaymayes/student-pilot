import { db } from '../db';
import { 
  recommendationFixtures,
  scholarships,
  type InsertRecommendationFixture,
  type RecommendationFixture 
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Manages ground-truth fixtures for recommendation validation
 */
export class FixtureManagerService {
  
  /**
   * Initialize with comprehensive ground-truth fixtures
   */
  async initializeFixtures(): Promise<void> {
    console.log('Initializing recommendation validation fixtures...');

    // Check if fixtures already exist
    const existingFixtures = await db.select().from(recommendationFixtures).limit(1);
    if (existingFixtures.length > 0) {
      console.log('Fixtures already exist, skipping initialization');
      return;
    }

    // Create comprehensive test fixtures
    const fixtures: InsertRecommendationFixture[] = [
      {
        name: 'High GPA Engineering Student',
        description: 'Computer Science major with 3.8+ GPA and strong extracurriculars',
        studentProfile: {
          gpa: '3.85',
          major: 'Computer Science',
          academicLevel: 'junior',
          graduationYear: 2025,
          school: 'MIT',
          location: 'Boston, MA',
          demographics: {
            ethnicity: 'Asian American',
            gender: 'Male',
            firstGeneration: false
          },
          interests: ['AI/ML', 'Robotics', 'Software Development'],
          extracurriculars: ['Programming Club', 'Robotics Team', 'Math Tutoring'],
          achievements: ['Dean\'s List', 'Hackathon Winner', 'Research Assistant'],
          financialNeed: false,
        },
        expectedScholarships: [], // Will be populated with actual scholarship IDs
        topNThreshold: 5,
        minimumScore: 75,
        tags: ['high-gpa', 'engineering', 'stem', 'competitive']
      },
      
      {
        name: 'First-Generation College Student',
        description: 'Business major, first-gen, high financial need, solid academics',
        studentProfile: {
          gpa: '3.4',
          major: 'Business Administration',
          academicLevel: 'sophomore',
          graduationYear: 2026,
          school: 'State University',
          location: 'Phoenix, AZ',
          demographics: {
            ethnicity: 'Hispanic/Latino',
            gender: 'Female',
            firstGeneration: true
          },
          interests: ['Entrepreneurship', 'Marketing', 'Finance'],
          extracurriculars: ['Business Club', 'Volunteer Work', 'Part-time Job'],
          achievements: ['Honor Roll', 'Community Volunteer Award'],
          financialNeed: true,
        },
        expectedScholarships: [],
        topNThreshold: 5,
        minimumScore: 65,
        tags: ['first-generation', 'business', 'financial-need', 'underrepresented']
      },

      {
        name: 'STEM Female Scholar',
        description: 'Female engineering student with research experience',
        studentProfile: {
          gpa: '3.7',
          major: 'Electrical Engineering',
          academicLevel: 'senior',
          graduationYear: 2024,
          school: 'Cal Tech',
          location: 'Pasadena, CA',
          demographics: {
            ethnicity: 'White',
            gender: 'Female',
            firstGeneration: false
          },
          interests: ['Electronics', 'Renewable Energy', 'Research'],
          extracurriculars: ['IEEE Chapter', 'Research Lab', 'Women in Engineering'],
          achievements: ['Research Publication', 'Dean\'s List', 'Engineering Honor Society'],
          financialNeed: false,
        },
        expectedScholarships: [],
        topNThreshold: 5,
        minimumScore: 70,
        tags: ['female-stem', 'engineering', 'research', 'high-achiever']
      },

      {
        name: 'Diverse Background Pre-Med',
        description: 'Biology major from underrepresented background with healthcare focus',
        studentProfile: {
          gpa: '3.6',
          major: 'Biology',
          academicLevel: 'junior',
          graduationYear: 2025,
          school: 'Howard University',
          location: 'Washington, DC',
          demographics: {
            ethnicity: 'African American',
            gender: 'Male',
            firstGeneration: true
          },
          interests: ['Medicine', 'Public Health', 'Research'],
          extracurriculars: ['Pre-Med Society', 'Hospital Volunteer', 'Mentorship Program'],
          achievements: ['MCAT Prep Scholar', 'Community Health Award', 'Research Intern'],
          financialNeed: true,
        },
        expectedScholarships: [],
        topNThreshold: 5,
        minimumScore: 70,
        tags: ['pre-med', 'underrepresented', 'healthcare', 'financial-need']
      },

      {
        name: 'Creative Arts Student',
        description: 'Art student with strong portfolio and community involvement',
        studentProfile: {
          gpa: '3.3',
          major: 'Fine Arts',
          academicLevel: 'sophomore',
          graduationYear: 2026,
          school: 'Art Institute',
          location: 'New York, NY',
          demographics: {
            ethnicity: 'White',
            gender: 'Female',
            firstGeneration: false
          },
          interests: ['Painting', 'Digital Art', 'Art Education'],
          extracurriculars: ['Art Club', 'Gallery Assistant', 'Art Tutoring'],
          achievements: ['Portfolio Award', 'Gallery Exhibition', 'Art Scholarship'],
          financialNeed: true,
        },
        expectedScholarships: [],
        topNThreshold: 5,
        minimumScore: 60,
        tags: ['creative-arts', 'portfolio-based', 'financial-need']
      },

      {
        name: 'International Student',
        description: 'International engineering student with strong academics',
        studentProfile: {
          gpa: '3.9',
          major: 'Mechanical Engineering',
          academicLevel: 'graduate',
          graduationYear: 2025,
          school: 'Stanford University',
          location: 'Palo Alto, CA',
          demographics: {
            ethnicity: 'Asian',
            gender: 'Male',
            firstGeneration: false,
            international: true
          },
          interests: ['Robotics', 'Manufacturing', 'Innovation'],
          extracurriculars: ['International Student Association', 'Engineering Society'],
          achievements: ['Outstanding Student Award', 'Research Excellence'],
          financialNeed: false,
        },
        expectedScholarships: [],
        topNThreshold: 5,
        minimumScore: 75,
        tags: ['international', 'graduate', 'engineering', 'high-gpa']
      },

      {
        name: 'Low GPA High Potential',
        description: 'Student with lower GPA but strong extracurriculars and improvement',
        studentProfile: {
          gpa: '2.8',
          major: 'Communications',
          academicLevel: 'junior',
          graduationYear: 2025,
          school: 'Community College',
          location: 'Denver, CO',
          demographics: {
            ethnicity: 'Hispanic/Latino',
            gender: 'Female',
            firstGeneration: true
          },
          interests: ['Journalism', 'Media Production', 'Social Justice'],
          extracurriculars: ['Newspaper Editor', 'Community Outreach', 'Part-time Job'],
          achievements: ['Journalism Award', 'Community Leader', 'Academic Improvement'],
          financialNeed: true,
        },
        expectedScholarships: [],
        topNThreshold: 5,
        minimumScore: 40,
        tags: ['lower-gpa', 'improvement', 'financial-need', 'leadership']
      }
    ];

    // Insert fixtures into database
    for (const fixture of fixtures) {
      try {
        await db.insert(recommendationFixtures).values(fixture);
        console.log(`Created fixture: ${fixture.name}`);
      } catch (error) {
        console.error(`Error creating fixture ${fixture.name}:`, error);
      }
    }

    console.log(`Initialized ${fixtures.length} validation fixtures`);
  }

  /**
   * Update fixture with matching scholarship IDs based on manual curation
   */
  async updateFixtureExpectedScholarships(
    fixtureName: string,
    scholarshipIds: string[]
  ): Promise<void> {
    await db
      .update(recommendationFixtures)
      .set({
        expectedScholarships: scholarshipIds,
        updatedAt: new Date()
      })
      .where(eq(recommendationFixtures.name, fixtureName));

    console.log(`Updated expected scholarships for fixture: ${fixtureName}`);
  }

  /**
   * Create sample scholarships for testing if none exist
   */
  async createSampleScholarships(): Promise<void> {
    console.log('Creating sample scholarships for validation...');

    const existingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(scholarships);

    if (Number(existingCount[0].count) > 0) {
      console.log('Scholarships already exist, skipping sample creation');
      return;
    }

    const sampleScholarships = [
      {
        title: 'STEM Excellence Scholarship',
        organization: 'Tech Foundation',
        amount: 10000,
        description: 'For outstanding Computer Science and Engineering students with 3.5+ GPA',
        requirements: ['3.5+ GPA', 'STEM Major', 'Leadership Experience'],
        eligibilityCriteria: {
          minGpa: 3.5,
          allowedMajors: ['Computer Science', 'Engineering', 'Mathematics'],
          academicLevels: ['junior', 'senior']
        },
        deadline: new Date('2024-12-31'),
        applicationUrl: 'https://techfoundation.org/apply',
        estimatedApplicants: 500,
        isActive: true
      },
      {
        title: 'First-Generation College Success Award',
        organization: 'Education Equity Fund',
        amount: 7500,
        description: 'Supporting first-generation college students across all majors',
        requirements: ['First-generation status', 'Financial need', 'Community involvement'],
        eligibilityCriteria: {
          firstGeneration: true,
          financialNeed: true,
          minGpa: 2.5
        },
        deadline: new Date('2024-11-30'),
        applicationUrl: 'https://educationequity.org/apply',
        estimatedApplicants: 800,
        isActive: true
      },
      {
        title: 'Women in Engineering Grant',
        organization: 'Engineering Women\'s Society',
        amount: 8000,
        description: 'Encouraging female students in engineering fields',
        requirements: ['Female gender', 'Engineering major', 'Academic excellence'],
        eligibilityCriteria: {
          gender: 'Female',
          allowedMajors: ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'],
          minGpa: 3.0
        },
        deadline: new Date('2024-10-15'),
        applicationUrl: 'https://ews.org/scholarships',
        estimatedApplicants: 300,
        isActive: true
      },
      {
        title: 'Healthcare Heroes Scholarship',
        organization: 'Medical Professional Association',
        amount: 12000,
        description: 'For pre-med and health science students from diverse backgrounds',
        requirements: ['Healthcare focus', 'Community service', 'Academic achievement'],
        eligibilityCriteria: {
          allowedMajors: ['Biology', 'Pre-Med', 'Health Sciences', 'Nursing'],
          minGpa: 3.3,
          communityService: true
        },
        deadline: new Date('2024-09-30'),
        applicationUrl: 'https://medicalprofessionals.org/scholarships',
        estimatedApplicants: 600,
        isActive: true
      },
      {
        title: 'Creative Arts Excellence Fund',
        organization: 'Arts Education Foundation',
        amount: 5000,
        description: 'Supporting talented artists and creative students',
        requirements: ['Arts major', 'Portfolio submission', 'Financial need consideration'],
        eligibilityCriteria: {
          allowedMajors: ['Fine Arts', 'Graphic Design', 'Art Education', 'Studio Arts'],
          portfolioRequired: true
        },
        deadline: new Date('2024-08-15'),
        applicationUrl: 'https://artseducation.org/apply',
        estimatedApplicants: 200,
        isActive: true
      }
    ];

    for (const scholarship of sampleScholarships) {
      try {
        await db.insert(scholarships).values(scholarship);
        console.log(`Created scholarship: ${scholarship.title}`);
      } catch (error) {
        console.error(`Error creating scholarship ${scholarship.title}:`, error);
      }
    }

    // Now update fixtures with expected scholarship matches
    await this.mapFixturesToScholarships();
  }

  /**
   * Manually map fixtures to expected scholarships based on criteria alignment
   */
  private async mapFixturesToScholarships(): Promise<void> {
    console.log('Mapping fixtures to expected scholarships...');

    const allScholarships = await db.select().from(scholarships);
    const scholarshipMap = new Map(allScholarships.map(s => [s.title, s.id]));

    // Define expected matches for each fixture
    const expectedMatches = {
      'High GPA Engineering Student': [
        'STEM Excellence Scholarship',
        'Women in Engineering Grant' // If student were female
      ],
      'First-Generation College Student': [
        'First-Generation College Success Award'
      ],
      'STEM Female Scholar': [
        'STEM Excellence Scholarship',
        'Women in Engineering Grant'
      ],
      'Diverse Background Pre-Med': [
        'First-Generation College Success Award',
        'Healthcare Heroes Scholarship'
      ],
      'Creative Arts Student': [
        'Creative Arts Excellence Fund'
      ],
      'International Student': [
        'STEM Excellence Scholarship'
      ],
      'Low GPA High Potential': [
        'First-Generation College Success Award'
      ]
    };

    for (const [fixtureName, expectedTitles] of Object.entries(expectedMatches)) {
      const scholarshipIds = expectedTitles
        .map(title => scholarshipMap.get(title))
        .filter(id => id !== undefined) as string[];

      if (scholarshipIds.length > 0) {
        await this.updateFixtureExpectedScholarships(fixtureName, scholarshipIds);
      }
    }

    console.log('Completed fixture-to-scholarship mapping');
  }

  /**
   * Get all active fixtures
   */
  async getActiveFixtures(): Promise<RecommendationFixture[]> {
    return await db
      .select()
      .from(recommendationFixtures)
      .where(eq(recommendationFixtures.isActive, true));
  }

  /**
   * Reset all fixtures (for testing)
   */
  async resetFixtures(): Promise<void> {
    await db.delete(recommendationFixtures);
    console.log('Reset all fixtures');
  }
}

export const fixtureManager = new FixtureManagerService();