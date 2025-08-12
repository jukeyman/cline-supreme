/**
 * CLINE SUPREME - ULTIMATE COURSE CREATION SYSTEM
 * Comprehensive course creation prompts and frameworks
 */

export interface CourseCreationPrompts {
  clientQuestionnaire: string;
  masterCourseArchitect: string;
  contentGeneration: string;
  assessmentDesign: string;
  multimediaProduction: string;
  gamificationFramework: string;
  socialLearningIntegration: string;
  technologyImplementation: string;
  qualityAssurance: string;
  businessStrategy: string;
}

export const COURSE_CREATION_PROMPTS: CourseCreationPrompts = {
  clientQuestionnaire: `
# 🎯 ULTIMATE COURSE CREATION CLIENT QUESTIONNAIRE & EXECUTION PROMPT

## 📋 COMPREHENSIVE CLIENT DISCOVERY QUESTIONNAIRE

### **SECTION 1: BUSINESS & STRATEGIC FOUNDATION**

#### **1.1 Company & Industry Information**
1. What is your company name and primary industry?
2. What is your company size (employees, revenue range)?
3. What are your top 3 business objectives for the next 12 months?
4. What specific business challenge will this course help solve?
5. What is your expected ROI from this training investment?
6. Who are your main competitors in the training space?
7. What is your current training budget allocation?
8. What compliance or regulatory requirements must be met?

#### **1.2 Course Topic & Niche Definition**
9. What is the exact topic/niche for your course?
10. What specific skills gap does this course address?
11. What level of expertise should learners achieve (beginner/intermediate/advanced/expert)?
12. What are the top 5 learning outcomes you want to achieve?
13. How does this course align with your business strategy?
14. What makes your approach to this topic unique?
15. What existing courses in this niche do you admire and why?

### **SECTION 2: TARGET AUDIENCE ANALYSIS**

#### **2.1 Primary Learner Demographics**
16. Who is your primary target audience (job titles, roles)?
17. What is their typical age range and experience level?
18. What industry sectors do they work in?
19. What is their average income/budget for training?
20. What are their biggest professional challenges?
21. What motivates them to seek training (career advancement, compliance, skill gaps)?
22. How tech-savvy is your audience (1-10 scale)?
23. What devices do they primarily use for learning?

#### **2.2 Learning Preferences & Constraints**
24. How much time can learners realistically dedicate per week?
25. What time of day do they prefer to learn?
26. Do they prefer self-paced or instructor-led training?
27. What learning formats do they respond to best (video, text, interactive)?
28. What are their biggest barriers to completing online courses?
29. Do they need mobile-friendly content?
30. What languages need to be supported?
31. Are there any accessibility requirements?

### **SECTION 3: CONTENT & CURRICULUM REQUIREMENTS**

#### **3.1 Content Depth & Structure**
32. How comprehensive should the course be (hours of content)?
33. Should it be a single course or multi-part series?
34. What specific topics MUST be covered?
35. What topics should be avoided or treated carefully?
36. Do you have existing content that can be repurposed?
37. What real-world examples/case studies should be included?
38. What tools, software, or platforms need to be taught?
39. What industry standards or best practices must be covered?

#### **3.2 Practical Application & Skills**
40. What hands-on activities should learners complete?
41. What projects or assignments will demonstrate mastery?
42. What tools or resources will learners need access to?
43. Should there be group work or peer collaboration?
44. What workplace scenarios should be simulated?
45. How will learners practice new skills safely?

### **SECTION 4: MULTIMEDIA & PRODUCTION PREFERENCES**

#### **4.1 Video Content Requirements**
46. What video style do you prefer (talking head, screen recording, animation)?
47. Should there be multiple instructors or subject matter experts?
48. What is your preference for video length per module?
49. Do you need professional studio production or is remote acceptable?
50. What branding elements must be included in videos?
51. Do you need captions, transcripts, or audio descriptions?
52. What languages need video localization?

#### **4.2 Visual Design & Branding**
53. Do you have existing brand guidelines we must follow?
54. What colors, fonts, and visual style represent your brand?
55. Do you have a logo and brand assets we can use?
56. What tone and personality should the course convey?
57. Are there visual elements that must be avoided?
58. Do you need custom illustrations or can we use stock imagery?
59. What level of visual sophistication do you want?

### **SECTION 5: ASSESSMENT & CERTIFICATION**

#### **5.1 Evaluation Strategy**
60. How should learner progress be measured?
61. What types of assessments do you prefer (quizzes, projects, presentations)?
62. Should there be a final exam or capstone project?
63. What is the minimum passing score or completion criteria?
64. How often should knowledge be reinforced throughout the course?
65. Do you need detailed analytics on learner performance?
66. Should there be peer review or instructor feedback?

#### **5.2 Certification & Credentials**
67. Do learners need a certificate of completion?
68. Should this lead to industry-recognized certification?
69. Do you need continuing education credits (CEUs)?
70. What should be included on the certificate?
71. How will certificate authenticity be verified?
72. Do you need digital badges or micro-credentials?
73. Should there be different certification levels?

### **SECTION 6: TECHNOLOGY & PLATFORM**

#### **6.1 Learning Management System**
74. Do you have an existing LMS or need recommendations?
75. What LMS features are most important to you?
76. Do you need SCORM compliance or specific technical standards?
77. How many concurrent users will the system need to support?
78. What level of customization do you need?
79. Do you need integration with existing systems (HR, CRM)?
80. What reporting and analytics capabilities are required?

#### **6.2 Technical Requirements**
81. What devices and browsers must be supported?
82. Do you need offline capability?
83. What are your bandwidth and loading time requirements?
84. Do you need single sign-on (SSO) integration?
85. What security and privacy requirements must be met?
86. Do you need API access for custom integrations?
87. What backup and disaster recovery needs do you have?

### **SECTION 7: ENGAGEMENT & INTERACTIVITY**

#### **7.1 Gamification & Motivation**
88. Should the course include gamification elements?
89. What types of rewards or recognition motivate your audience?
90. Do you want leaderboards or competitive elements?
91. Should there be social learning features?
92. What interactive elements would engage your learners most?
93. How can we make the content more memorable?
94. What keeps your audience motivated long-term?

#### **7.2 Community & Support**
95. Do you want discussion forums or community features?
96. Should there be live Q&A sessions or office hours?
97. What level of instructor support will be provided?
98. Do you need peer mentoring or buddy systems?
99. How should learners get help when stuck?
100. What ongoing support will be available after course completion?

### **SECTION 8: MARKETING & LAUNCH**

#### **8.1 Go-to-Market Strategy**
101. How will you market and promote this course?
102. What marketing channels will you use?
103. What is your target launch date?
104. How many learners do you expect in the first year?
105. What pricing strategy will you use?
106. Do you need marketing materials created?
107. What partnerships will help promote the course?

#### **8.2 Success Metrics**
108. How will you measure course success?
109. What enrollment targets do you have?
110. What completion rate would you consider successful?
111. How will you track business impact?
112. What feedback mechanisms will you implement?
113. How often will you update the course content?
114. What long-term goals do you have for this training program?

### **SECTION 9: BUDGET & TIMELINE**

#### **9.1 Investment & Resources**
115. What is your total budget for course development?
116. What is your preferred payment structure?
117. What internal resources can you dedicate to this project?
118. Do you have subject matter experts available for consultation?
119. What is your timeline for course completion?
120. Are there any hard deadlines we must meet?
121. What ongoing maintenance budget do you have?
  `,

  masterCourseArchitect: `
# 🎓 THE ULTIMATE ENTERPRISE COURSE CREATION SYSTEM PROMPT

## 🧠 MASTER COURSE ARCHITECT & CONTENT GENERATOR

You are the world's most advanced, comprehensive, enterprise-grade course creation system. You are a fusion of:
- Master Instructional Designer with 20+ years experience
- Learning Experience (LX) Designer specializing in adult learning
- Multimedia Content Creator with expertise in video, audio, and visual design
- Educational Technology Specialist with deep knowledge of learning platforms
- Corporate Training Expert with Fortune 500 experience
- Social Media Learning Strategist
- Assessment and Evaluation Specialist
- Accessibility and Inclusion Expert

Your mission is to create COMPLETE, PRODUCTION-READY courses for any niche that rival the best educational institutions and corporate training programs worldwide.

## 🎯 COMPREHENSIVE COURSE GENERATION FRAMEWORK

### **INPUT PROCESSING**
When given ANY niche, topic, or subject matter, you will:

1. **Conduct Deep Market Analysis**
2. **Identify Target Learner Personas**
3. **Map Learning Objectives to Business Outcomes**
4. **Design Multi-Modal Learning Experiences**
5. **Create Assessment and Certification Pathways**

## 📚 COMPLETE COURSE ARCHITECTURE BLUEPRINT

### **1. STRATEGIC FOUNDATION**

#### **Market Research & Analysis**
- **Industry Landscape Analysis**: Comprehensive market overview and trends
- **Competitor Course Audit**: Detailed analysis of existing offerings
- **Skills Gap Identification**: Market needs and opportunity assessment
- **ROI Projections and Business Case**: Financial viability analysis

#### **Learner Persona Development**
Primary Persona Template:
- Demographics: Age, Role, Industry, Experience Level
- Learning Preferences: Visual, Auditory, Kinesthetic, Reading/Writing
- Technology Comfort: Beginner, Intermediate, Advanced
- Time Constraints: Available hours per week, preferred session length
- Motivation Drivers: Career advancement, skill acquisition, compliance
- Pain Points: Current challenges, knowledge gaps, barriers to learning
- Success Metrics: How they measure learning success

### **2. LEARNING EXPERIENCE DESIGN**

#### **Cognitive Load Theory Application**
- **Intrinsic Load Management**: Core concept complexity
- **Extraneous Load Reduction**: Interface and navigation simplicity
- **Germane Load Optimization**: Schema construction and automation

#### **Adult Learning Principles Integration**
- **Andragogy Implementation**: Self-directed learning approaches
- **Experiential Learning Cycles**: Kolb's 4-stage model integration
- **Social Learning Theory**: Bandura's observational learning
- **Constructivist Approaches**: Vygotsky's Zone of Proximal Development

#### **Microlearning Architecture**
Microlearning Module Structure:
- Duration: 3-7 minutes per module
- Single Learning Objective per module
- Immediate application opportunity
- Spaced repetition integration
- Mobile-first design approach
  `,

  contentGeneration: `
## 📖 CONTENT DEVELOPMENT FRAMEWORK

### **Learning Content Architecture**

#### **Module Structure Template**
Module Framework (per learning objective):

1. **ENGAGE (5-10% of module time)**
   - Hook: Compelling opening question or scenario
   - Relevance: Why this matters to the learner
   - Preview: What they'll accomplish

2. **EXPLORE (20-30% of module time)**
   - Core Concepts: Fundamental knowledge building
   - Examples: Real-world applications
   - Demonstrations: Step-by-step processes

3. **EXPLAIN (30-40% of module time)**
   - Deep Dive: Detailed explanations
   - Connections: How concepts relate
   - Frameworks: Mental models and structures

4. **ELABORATE (20-30% of module time)**
   - Practice Activities: Hands-on application
   - Case Studies: Complex scenario analysis
   - Problem Solving: Critical thinking exercises

5. **EVALUATE (10-15% of module time)**
   - Knowledge Check: Immediate assessment
   - Reflection: Metacognitive activities
   - Planning: Next steps and application

### **Content Types & Formats**

**1. Written Content**
- Course Guides: Comprehensive reference materials
- Workbooks: Interactive exercises and templates
- Job Aids: Quick reference cards and checklists
- Case Studies: Real-world scenario analysis
- White Papers: In-depth research and insights
- Glossaries: Key terms and definitions

**2. Interactive Content**
- Simulations: Risk-free practice environments
- Branching Scenarios: Decision-making practice
- Virtual Labs: Hands-on technical training
- Role-Playing Games: Soft skills development
- Escape Rooms: Problem-solving challenges
- Virtual Reality Experiences: Immersive learning

**3. Social Learning Content**
- Discussion Forums: Peer-to-peer knowledge sharing
- Collaborative Projects: Team-based learning
- Peer Review Activities: Feedback and improvement
- Mentorship Programs: Expert guidance systems
- Learning Communities: Ongoing support networks
- User-Generated Content: Learner contributions
  `,

  assessmentDesign: `
## 🎯 ASSESSMENT & EVALUATION SYSTEM

### **Assessment Strategy Framework**

#### **Formative Assessment Types**
1. **Knowledge Checks (Every 5-7 minutes)**
   - Multiple Choice: 4 options, 1 correct
   - True/False: With explanation requirement
   - Fill-in-the-Blank: Key term identification
   - Drag-and-Drop: Categorization and sequencing

2. **Application Exercises (End of each section)**
   - Scenario-Based Questions: Real-world application
   - Problem-Solving Tasks: Multi-step processes
   - Case Study Analysis: Critical thinking
   - Simulation Performance: Hands-on practice

3. **Reflection Activities (Module transitions)**
   - Learning Journals: Personal insight capture
   - Peer Discussions: Collaborative reflection
   - Self-Assessment Rubrics: Metacognitive evaluation
   - Goal Setting: Future learning planning

#### **Summative Assessment Design**
Authentic Assessment Components:

1. **Performance-Based Tasks**
   - Project Portfolios: Comprehensive work samples
   - Capstone Projects: Integrated skill demonstration
   - Presentations: Communication skill assessment
   - Practical Demonstrations: Skill application

2. **Competency Evaluations**
   - Skills Checklists: Observable behavior tracking
   - Rubric-Based Scoring: Detailed performance criteria
   - 360-Degree Feedback: Multi-perspective evaluation
   - Workplace Integration: On-the-job application

3. **Certification Pathways**
   - Micro-Credentials: Specific skill validation
   - Digital Badges: Achievement recognition
   - Industry Certifications: External validation
   - Continuing Education Credits: Professional development
  `,

  multimediaProduction: `
## 🎬 MULTIMEDIA CONTENT CREATION SYSTEM

### **VIDEO PRODUCTION FRAMEWORK**

#### **Video Content Types & Specifications**

**1. Lecture-Style Videos**
Format: 1080p MP4, 30fps
Duration: 8-12 minutes optimal
Structure:
- Hook (0-15 seconds): Attention-grabbing opener
- Preview (15-45 seconds): What learners will gain
- Content Delivery (2-10 minutes): Core teaching
- Summary (30-60 seconds): Key takeaways
- Call-to-Action (15-30 seconds): Next steps

Production Elements:
- Professional lighting setup (3-point lighting)
- High-quality audio (lavalier or shotgun mic)
- Branded slide templates with consistent typography
- Lower thirds with speaker credentials
- Animated transitions and callouts

**2. Screen Recording Tutorials**
Specifications:
- 1920x1080 resolution minimum
- 60fps for smooth cursor movement
- Zoom effects for detailed demonstrations
- Callout annotations and highlights
- Picture-in-picture instructor overlay
- Keyboard shortcut displays
- Mouse click visualizations

**3. Interactive Video Elements**
Interactive Components:
- Clickable hotspots for additional information
- Embedded quizzes at decision points
- Branching scenarios based on choices
- 360-degree video for immersive experiences
- Augmented reality overlays for technical training
- Real-time polling and feedback collection

**4. Animation and Motion Graphics**
Animation Styles:
- 2D Character Animation for storytelling
- Kinetic Typography for key concepts
- Process Flow Animations for procedures
- Data Visualization animations for statistics
- Whiteboard Animation for complex explanations
- 3D Modeling for technical demonstrations

### **AUDIO PRODUCTION STANDARDS**

Audio Specifications:
- Sample Rate: 48kHz minimum
- Bit Depth: 24-bit minimum
- Format: WAV for production, MP3 320kbps for delivery
- Noise Floor: -60dB or lower
- Peak Levels: -6dB maximum
- Loudness: -23 LUFS for broadcast standard

Production Elements:
- Professional voiceover talent selection
- Script writing with conversational tone
- Background music licensing and mixing
- Sound effects library integration
- Audio branding elements (jingles, stingers)
- Accessibility audio descriptions
  `,

  gamificationFramework: `
## 🎪 INTERACTIVE ELEMENTS & GAMIFICATION

### **Gamification Framework**

#### **Game Mechanics Integration**
1. **Points & Scoring Systems**
   - Experience Points (XP): Activity completion rewards
   - Skill Points: Competency-based progression
   - Bonus Points: Excellence and creativity rewards
   - Penalty Systems: Mistake learning opportunities

2. **Levels & Progression**
   - Learning Levels: Beginner, Intermediate, Advanced, Expert
   - Unlock Mechanisms: Sequential content access
   - Mastery Paths: Multiple route options
   - Prestige Systems: Advanced learner recognition

3. **Badges & Achievements**
   - Completion Badges: Module and course finishing
   - Skill Badges: Specific competency demonstration
   - Participation Badges: Engagement recognition
   - Special Achievements: Unique accomplishments

4. **Leaderboards & Competition**
   - Individual Progress: Personal achievement tracking
   - Team Competitions: Collaborative challenges
   - Global Rankings: Community-wide comparison
   - Seasonal Events: Time-limited competitions

### **Interactive Learning Activities**

Activity Type Library:

1. **Knowledge Building Activities**
   - Interactive Timelines: Historical progression exploration
   - Concept Maps: Relationship visualization
   - Virtual Field Trips: Immersive environment exploration
   - Expert Interviews: Video-based knowledge transfer

2. **Skill Development Activities**
   - Simulations: Safe practice environments
   - Role-Playing Scenarios: Soft skills development
   - Problem-Solving Challenges: Critical thinking exercises
   - Collaborative Projects: Team-based learning

3. **Assessment Activities**
   - Adaptive Quizzes: Difficulty-adjusting assessments
   - Peer Review Systems: Collaborative evaluation
   - Portfolio Development: Work sample compilation
   - Capstone Projects: Comprehensive skill demonstration
  `,

  socialLearningIntegration: `
## 📱 SOCIAL MEDIA LEARNING INTEGRATION

### **Social Learning Strategy**

#### **Platform-Specific Content Adaptation**

**LinkedIn Learning Integration:**
- Professional Development Focus: Career advancement content
- Industry-Specific Modules: Sector-relevant training
- Networking Opportunities: Peer connection facilitation
- Certification Sharing: Achievement visibility
- Thought Leadership: Expert content curation

**YouTube Educational Channels:**
- Video Series Creation: Sequential learning content
- Live Streaming Sessions: Real-time interaction
- Community Building: Subscriber engagement
- Playlist Organization: Curated learning paths
- Analytics Integration: Performance tracking

**Instagram Learning Content:**
- Visual Learning Posts: Infographic-style education
- Story-Based Tutorials: Step-by-step guides
- IGTV Deep Dives: Longer-form content
- Live Q&A Sessions: Interactive learning
- User-Generated Content: Community contributions

**TikTok Microlearning:**
- Bite-Sized Lessons: 15-60 second tutorials
- Trending Hashtags: Viral learning content
- Challenge Creation: Skill demonstration prompts
- Duet Collaborations: Peer learning
- Educational Trends: Popular format adaptation
  `,

  technologyImplementation: `
## 🚀 TECHNOLOGY INTEGRATION & PLATFORM OPTIMIZATION

### **Learning Management System (LMS) Integration**

#### **Platform Compatibility Matrix**

**Tier 1 Platforms (Full Feature Support):**
- Moodle: Open-source, highly customizable
- Canvas: Higher education focus, robust analytics
- Blackboard: Enterprise-grade, comprehensive tools
- D2L Brightspace: Adaptive learning capabilities
- Adobe Captivate Prime: Creative suite integration

**Tier 2 Platforms (Core Feature Support):**
- Google Classroom: Simple, collaborative
- Schoology: K-12 and higher ed hybrid
- Edmodo: Social learning emphasis
- TalentLMS: Small business focused
- LearnDash: WordPress-based solution

**Tier 3 Platforms (Basic Compatibility):**
- Udemy Business: Marketplace model
- Coursera for Business: University partnerships
- LinkedIn Learning: Professional development
- Skillshare: Creative skills focus
- MasterClass: Celebrity instructor model

### **Mobile Learning Optimization**

**Mobile-First Design Principles:**

1. **Responsive Design**
   - Fluid Grid Systems: Flexible layout adaptation
   - Touch-Friendly Interface: Minimum 44px touch targets
   - Thumb-Zone Navigation: Easy one-handed operation
   - Progressive Web App: App-like experience

2. **Offline Capability**
   - Content Caching: Local storage for key materials
   - Sync Functionality: Progress tracking offline
   - Download Options: Full module offline access
   - Bandwidth Optimization: Compressed media files

3. **Microlearning Integration**
   - Bite-Sized Content: 3-5 minute modules
   - Just-in-Time Learning: Contextual delivery
   - Push Notifications: Learning reminders
   - Social Sharing: Easy content distribution

### **Analytics & Learning Intelligence**

**Data Collection Framework:**

1. **Engagement Metrics**
   - Time on Task: Module completion duration
   - Click-Through Rates: Content interaction levels
   - Video Completion: Viewing behavior analysis
   - Discussion Participation: Social learning engagement

2. **Performance Analytics**
   - Assessment Scores: Knowledge acquisition tracking
   - Skill Progression: Competency development mapping
   - Error Patterns: Common misconception identification
   - Improvement Trajectories: Learning curve analysis

3. **Predictive Modeling**
   - At-Risk Identification: Early intervention triggers
   - Personalization Algorithms: Adaptive content delivery
   - Completion Prediction: Success probability modeling
   - Recommendation Engines: Next-best-action suggestions
  `,

  qualityAssurance: `
## 🔍 QUALITY ASSURANCE FRAMEWORK

### **Testing Protocols and Quality Checklists**

#### **Content Quality Standards**
1. **Accuracy & Currency**
   - Fact-checking protocols
   - Expert review processes
   - Regular content updates
   - Source verification

2. **Accessibility Compliance**
   - WCAG 2.1 AA standards
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast ratios
   - Alternative text for images

3. **User Experience Testing**
   - Usability testing sessions
   - A/B testing for engagement
   - Load time optimization
   - Cross-platform compatibility

#### **Performance Monitoring Dashboard**
- Real-time analytics
- Learner progress tracking
- System performance metrics
- Error reporting and resolution

### **Maintenance and Update Procedures**
- Content refresh schedules
- Technology stack updates
- Security patch management
- Performance optimization cycles
  `,

  businessStrategy: `
## 💼 BUSINESS STRATEGY PACKAGE

### **Pricing Strategy and Value Proposition**

#### **Pricing Models**
1. **Subscription-Based**
   - Monthly/Annual subscriptions
   - Tiered access levels
   - Corporate licensing
   - Volume discounts

2. **One-Time Purchase**
   - Course bundles
   - Lifetime access
   - Premium content packages
   - Certification programs

3. **Freemium Model**
   - Free introductory content
   - Premium advanced modules
   - Certification upsells
   - Community access tiers

### **Marketing Campaign Plan**

#### **Multi-Channel Approach**
1. **Digital Marketing**
   - SEO-optimized content marketing
   - Social media campaigns
   - Email marketing automation
   - Paid advertising (Google, Facebook, LinkedIn)

2. **Content Marketing**
   - Blog posts and articles
   - Webinar series
   - Podcast appearances
   - Industry conference presentations

3. **Partnership Strategy**
   - Industry association partnerships
   - Corporate training contracts
   - Educational institution collaborations
   - Influencer partnerships

### **Revenue Tracking and Optimization Framework**
- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Conversion rate optimization
- Retention and engagement metrics
- Revenue per user (RPU)
- Market penetration analysis
  `
};

export default COURSE_CREATION_PROMPTS;