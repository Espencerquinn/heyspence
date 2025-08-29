import React, { useState } from 'react';
import './App.css';

function App() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeProgram, setActiveProgram] = useState('Live');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    state: '',
    country: '',
    hearAboutUs: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
    alert('Thank you for your interest! We\'ll send you the free info guide shortly.');
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      state: '',
      country: '',
      hearAboutUs: ''
    });
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const courses = [
    'Algebra 1', 'Algebra 2', 'American Foundations', 'American Government & Economics',
    'Artistic Performance', 'Athletic Performance', 'Biology', 'Business Technology',
    'Chemistry', 'Civility', 'Constitutional Studies', 'Experiential Learning',
    'Family Science', 'Financial Literacy', 'Geometry', 'Health',
    'History: Ancient Rome', 'Literature: Examining Conscience', 'Literature: Moral Aptitude',
    'Literature: Overcoming Obstacles', 'Literature: Reaching for Redemption', 'Literature: Self Governance',
    'Math 7', 'Physics', 'Pre-Algebra', 'Principles of Leadership',
    'Senior Thesis', 'US History: Founding Era', 'Written Portfolio: Effective Essays',
    'Written Portfolio: Narrative\'s Flow', 'Written Portfolio: Persuasion with Style',
    'Written Portfolio: Technical Tools', 'World History: Contemporary to Modern'
  ];

  const trendingCourses = [
    {
      id: 1,
      title: 'Entrepreneurship and AI',
      instructor: 'With Industry Experts',
      duration: '2 hours 30 minutes',
      episodes: '16 lessons',
      badge: 'New',
      image: '🤖',
      description: 'Learn how to build AI-powered businesses and leverage technology for entrepreneurial success.'
    },
    {
      id: 2,
      title: 'Constitutional Studies',
      instructor: 'With Professor David Mitchell',
      duration: '1 hour 45 minutes',
      episodes: '12 lessons',
      badge: 'New',
      image: '📜',
      description: 'Master the foundations of American government and constitutional principles.'
    },
    {
      id: 3,
      title: 'Principles of Leadership',
      instructor: 'With Leadership Experts',
      duration: '2 hours 15 minutes', 
      episodes: '15 lessons',
      badge: 'Popular',
      image: '👑',
      description: 'Develop essential leadership skills for academic and personal success.'
    },
    {
      id: 4,
      title: 'Literature: Self Governance',
      instructor: 'With Dr. Sarah Johnson',
      duration: '1 hour 30 minutes',
      episodes: '10 lessons',
      badge: 'New',
      image: '📚',
      description: 'Explore classic literature through the lens of personal responsibility.'
    },
    {
      id: 5,
      title: 'Senior Thesis',
      instructor: 'With Research Mentors',
      duration: '3 hours 20 minutes',
      episodes: '20 lessons',
      badge: 'Advanced',
      image: '🎓',
      description: 'Complete your capstone research project with expert guidance.'
    },
    {
      id: 6,
      title: 'American Government & Economics',
      instructor: 'With Policy Experts',
      duration: '2 hours 5 minutes',
      episodes: '18 lessons',
      badge: 'Popular',
      image: '🏛️',
      description: 'Understand how government and economics shape our daily lives.'
    },
    {
      id: 7,
      title: 'Experiential Learning',
      instructor: 'With Field Specialists',
      duration: '1 hour 50 minutes',
      episodes: '14 lessons',
      badge: 'Hands-on',
      image: '🔬',
      description: 'Learn through real-world projects and practical applications.'
    }
  ];

  const programs = {
    Live: {
      name: 'Live',
      price: '$360',
      priceUnit: 'per .5 Credit',
      description: 'Interactive live classes with real-time instruction and peer collaboration.',
      features: [
        { name: 'Online Course', included: true },
        { name: 'Live Zoom Classes', included: true },
        { name: 'Mentor Guided', included: true },
        { name: 'Earn Credit on Transcript', included: true },
        { name: 'Semester-Based', included: true },
        { name: 'Academic Advisors', included: true },
        { name: 'Student Devotionals', included: true },
        { name: 'Video Instructions', included: true },
        { name: 'Group Learning Options', included: true },
        { name: 'Late Work Policy', included: true },
        { name: 'Student Clubs/Activities', included: true },
        { name: 'Student Council', included: true },
        { name: 'On Campus Sports & Arts', included: false },
        { name: 'On Campus Clubs', included: false },
        { name: 'On Campus Seminary', included: false },
        { name: 'Participate in Dances', included: false }
      ]
    },
    MyPace: {
      name: 'MyPace',
      price: '$329',
      priceUnit: 'per .5 Credit',
      description: 'Self-paced learning with mentor support and flexible scheduling.',
      features: [
        { name: 'Online Course', included: true },
        { name: 'Live Zoom Classes', included: false },
        { name: 'Mentor Guided', included: true },
        { name: 'Earn Credit on Transcript', included: true },
        { name: 'Semester-Based', included: false },
        { name: 'Academic Advisors', included: true },
        { name: 'Student Devotionals', included: true },
        { name: 'Video Instructions', included: true },
        { name: 'Group Learning Options', included: false },
        { name: 'Late Work Policy', included: false },
        { name: 'Student Clubs/Activities', included: true },
        { name: 'Student Council', included: false },
        { name: 'On Campus Sports & Arts', included: false },
        { name: 'On Campus Clubs', included: false },
        { name: 'On Campus Seminary', included: false },
        { name: 'Participate in Dances', included: false }
      ]
    },
    'Non-Credit': {
      name: 'Non-Credit',
      price: '$109',
      priceUnit: 'per Course',
      description: 'Flexible learning without credit requirements, perfect for supplemental education.',
      features: [
        { name: 'Online Course', included: true },
        { name: 'Live Zoom Classes', included: false },
        { name: 'Mentor Guided', included: false },
        { name: 'Earn Credit on Transcript', included: false },
        { name: 'Semester-Based', included: false },
        { name: 'Academic Advisors', included: false },
        { name: 'Student Devotionals', included: false },
        { name: 'Video Instructions', included: true },
        { name: 'Group Learning Options', included: false },
        { name: 'Late Work Policy', included: false },
        { name: 'Student Clubs/Activities', included: false },
        { name: 'Student Council', included: false },
        { name: 'On Campus Sports & Arts', included: false },
        { name: 'On Campus Clubs', included: false },
        { name: 'On Campus Seminary', included: false },
        { name: 'Participate in Dances', included: false }
      ]
    },
    'Campus Connect': {
      name: 'Campus Connect',
      price: '$500',
      priceUnit: 'per semester',
      description: 'Full campus experience with online flexibility and on-campus activities.',
      features: [
        { name: 'Online Course', included: 'partial' },
        { name: 'Live Zoom Classes', included: 'partial' },
        { name: 'Mentor Guided', included: 'partial' },
        { name: 'Earn Credit on Transcript', included: 'partial' },
        { name: 'Semester-Based', included: 'partial' },
        { name: 'Academic Advisors', included: 'partial' },
        { name: 'Student Devotionals', included: 'partial' },
        { name: 'Video Instructions', included: 'partial' },
        { name: 'Group Learning Options', included: 'partial' },
        { name: 'Late Work Policy', included: 'partial' },
        { name: 'Student Clubs/Activities', included: 'partial' },
        { name: 'Student Council', included: 'partial' },
        { name: 'On Campus Sports & Arts', included: true },
        { name: 'On Campus Clubs', included: true },
        { name: 'On Campus Seminary', included: true },
        { name: 'Participate in Dances', included: true }
      ]
    }
  };

  const faqs = [
    {
      question: "Is American Heritage Online Accredited?",
      answer: "All our courses are accredited and can be taken for credit, which can then be transferred with an official AHS transcript."
    },
    {
      question: "Does my student have to apply?",
      answer: "New students must sign a commitment to our Honor Code and meet with an admissions staff member."
    },
    {
      question: "What does the path towards graduation look like?",
      answer: "HS Online diploma-seeking students must: Purchase the Graduation Package yearly ($200) in 9-12 grade, take at least 25% of all courses required for graduation through an AHS campus, take at least 3 two-semester courses with AHS Online during their Senior year, complete/pass 27 credit hours before the graduation date, and complete the following required courses at AHS Online: Constitutional Studies, Principles of Leadership, Senior Thesis, and Experiential Learning."
    },
    {
      question: "Can my student transfer current high school credits?",
      answer: "Yes. We accept credits from accredited high school programs. To learn more about AHS Online, please email Holly Langston at hlangston@ahsonline.org."
    },
    {
      question: "When do semesters start?",
      answer: "Fall Semester - Mid August through December. Winter Semester - January through May."
    },
    {
      question: "What's the cost of the programs?",
      answer: "Cost per Credit for MyPace & Diploma Seeking: For-Credit independent study courses have a base cost of $329 for .5 credits, with an additional cost of $11 for Math and $49 for Science. Diploma Seeking 'Full Load' - approximately $2135.50 per semester, plus a one-time fee of $200 for the grad pack."
    }
  ];

  return (
    <div className="App">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src="/ahs-logo.png" alt="American Heritage Online" className="logo-image" />
          </div>
          <div className="nav-links">
            <a href="#" className="nav-login">Login</a>
            <button className="nav-cta">Get Started</button>
          </div>
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#" className="mobile-nav-link">Login</a>
            <button className="mobile-nav-cta">Reserve Your Spot</button>
            <a href="#" className="mobile-nav-link">About</a>
            <a href="#" className="mobile-nav-link">Courses</a>
            <a href="#" className="mobile-nav-link">Admissions</a>
            <a href="#" className="mobile-nav-link">Support</a>
          </div>
        )}
      </nav>

      {/* Hero Section with Lead Capture */}
      <header className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-left">
              <h1 className="hero-title">Education At Home, Made Easy</h1>
              <p className="hero-subtitle">*98% of families recommend American Heritage Online</p>
              <p className="hero-description">
                The #1 Most Loved Program By Homeschool Families in America. 
                Experience faith-based education that mirrors our world-class private school 
                but makes it accessible to students anywhere.
              </p>
              
              <form className="lead-capture-form" onSubmit={handleSubmit}>
                <h3>Want to learn more? Request more info:</h3>
                <div className="form-row">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-row">
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select State</option>
                    <option value="AL">Alabama</option>
                    <option value="AK">Alaska</option>
                    <option value="AZ">Arizona</option>
                    <option value="AR">Arkansas</option>
                    <option value="CA">California</option>
                    <option value="CO">Colorado</option>
                    <option value="CT">Connecticut</option>
                    <option value="DE">Delaware</option>
                    <option value="FL">Florida</option>
                    <option value="GA">Georgia</option>
                    <option value="HI">Hawaii</option>
                    <option value="ID">Idaho</option>
                    <option value="IL">Illinois</option>
                    <option value="IN">Indiana</option>
                    <option value="IA">Iowa</option>
                    <option value="KS">Kansas</option>
                    <option value="KY">Kentucky</option>
                    <option value="LA">Louisiana</option>
                    <option value="ME">Maine</option>
                    <option value="MD">Maryland</option>
                    <option value="MA">Massachusetts</option>
                    <option value="MI">Michigan</option>
                    <option value="MN">Minnesota</option>
                    <option value="MS">Mississippi</option>
                    <option value="MO">Missouri</option>
                    <option value="MT">Montana</option>
                    <option value="NE">Nebraska</option>
                    <option value="NV">Nevada</option>
                    <option value="NH">New Hampshire</option>
                    <option value="NJ">New Jersey</option>
                    <option value="NM">New Mexico</option>
                    <option value="NY">New York</option>
                    <option value="NC">North Carolina</option>
                    <option value="ND">North Dakota</option>
                    <option value="OH">Ohio</option>
                    <option value="OK">Oklahoma</option>
                    <option value="OR">Oregon</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="RI">Rhode Island</option>
                    <option value="SC">South Carolina</option>
                    <option value="SD">South Dakota</option>
                    <option value="TN">Tennessee</option>
                    <option value="TX">Texas</option>
                    <option value="UT">Utah</option>
                    <option value="VT">Vermont</option>
                    <option value="VA">Virginia</option>
                    <option value="WA">Washington</option>
                    <option value="WV">West Virginia</option>
                    <option value="WI">Wisconsin</option>
                    <option value="WY">Wyoming</option>
                  </select>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="MX">Mexico</option>
                    <option value="BR">Brazil</option>
                    <option value="IN">India</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-row-full">
                  <select
                    name="hearAboutUs"
                    value={formData.hearAboutUs}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">How did you hear about us?</option>
                    <option value="google">Google Search</option>
                    <option value="social-media">Social Media</option>
                    <option value="friend-family">Friend or Family</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="blog-article">Blog or Article</option>
                    <option value="homeschool-group">Homeschool Group</option>
                    <option value="education-fair">Education Fair</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button type="submit" className="form-submit-btn">Get Free Info Guide</button>
                <p className="form-disclaimer">100% Free • No Commitment Required</p>
              </form>
            </div>
            
            <div className="hero-right">
              <div className="scrolling-images">
                <div className="image-scroll">
                  <div className="scroll-item">
                    <div className="student-card">
                      <div className="student-avatar">👩‍🎓</div>
                      <h4>Sarah M.</h4>
                      <p>"AHS Online gave me the flexibility to pursue my passion for music while maintaining academic excellence."</p>
                    </div>
                  </div>
                  <div className="scroll-item">
                    <div className="student-card">
                      <div className="student-avatar">👨‍🎓</div>
                      <h4>David L.</h4>
                      <p>"The faith-based curriculum helped me grow both academically and spiritually."</p>
                    </div>
                  </div>
                  <div className="scroll-item">
                    <div className="student-card">
                      <div className="student-avatar">👩‍🎓</div>
                      <h4>Emma R.</h4>
                      <p>"Live mentoring sessions made all the difference in my learning journey."</p>
                    </div>
                  </div>
                  <div className="scroll-item">
                    <div className="student-card">
                      <div className="student-avatar">👨‍🎓</div>
                      <h4>Michael T.</h4>
                      <p>"I was able to graduate early and start college with confidence."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Video Testimonial Section */}
      <section className="testimonial-section">
        <div className="container">
          <div className="testimonial-content">
            <div className="testimonial-video">
              <div className="video-placeholder">
                <div className="play-button">▶</div>
                <div className="testimonial-placeholder"></div>
              </div>
            </div>
            <div className="testimonial-text">
              <h2>"Merge the faithful home with the faithful school."</h2>
              <p>Hear from our students about their experience with American Heritage Online and how it has transformed their education journey.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Program Comparison Section */}
      <section className="program-comparison-section">
        <div className="container">
          <div className="comparison-header">
            <h2>Choose Your Learning Path</h2>
            <p>Discover the flexibility of American Heritage Online with programs designed to fit your student's unique needs and schedule.</p>
          </div>
          
          <div className="program-tabs">
            {Object.keys(programs).map((programKey) => (
              <button
                key={programKey}
                className={`program-tab ${activeProgram === programKey ? 'active' : ''}`}
                onClick={() => setActiveProgram(programKey)}
              >
                {programs[programKey].name}
              </button>
            ))}
            <button
              className={`program-tab ${activeProgram === 'Compare All' ? 'active' : ''}`}
              onClick={() => setActiveProgram('Compare All')}
            >
              Compare All
            </button>
          </div>

          {activeProgram === 'Compare All' ? (
            <div className="comparison-table-container">
              <div className="comparison-table">
                <div className="comparison-header-row">
                  <div className="feature-column">Features</div>
                  {Object.keys(programs).map((programKey) => (
                    <div key={programKey} className="program-column">
                      <div className="program-header">
                        <h4>{programs[programKey].name}</h4>
                        <div className="program-price">
                          <span className="price">{programs[programKey].price}</span>
                          <span className="price-unit">{programs[programKey].priceUnit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {programs.Live.features.map((feature, index) => (
                  <div key={index} className="comparison-row">
                    <div className="feature-column">{feature.name}</div>
                    {Object.keys(programs).map((programKey) => (
                      <div key={programKey} className="program-column">
                        <span className={`feature-status ${
                          programs[programKey].features[index].included === true ? 'included' : 
                          programs[programKey].features[index].included === false ? 'not-included' : 'partial'
                        }`}>
                          {programs[programKey].features[index].included === true ? '✓' : 
                           programs[programKey].features[index].included === false ? '✗' : '*'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div className="comparison-cta-row">
                  <div className="feature-column"></div>
                  {Object.keys(programs).map((programKey) => (
                    <div key={programKey} className="program-column">
                      <button className="comparison-cta-btn" onClick={() => setActiveProgram(programKey)}>
                        Join webinar to learn more
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="program-details">
              <div className="program-overview">
                <div className="program-info">
                  <h3>{programs[activeProgram].name}</h3>
                  <p className="program-description">{programs[activeProgram].description}</p>
                  <div className="program-pricing">
                    <span className="price">{programs[activeProgram].price}</span>
                    <span className="price-unit">{programs[activeProgram].priceUnit}</span>
                  </div>
                </div>
              </div>

              <div className="features-comparison">
                <div className="features-list">
                  {programs[activeProgram].features.map((feature, index) => (
                    <div key={index} className="feature-item">
                      <span className="feature-name">{feature.name}</span>
                      <span className={`feature-status ${
                        feature.included === true ? 'included' : 
                        feature.included === false ? 'not-included' : 'partial'
                      }`}>
                        {feature.included === true ? '✓' : 
                         feature.included === false ? '✗' : '*'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="program-cta">
                <button className="program-cta-btn">Join webinar to learn more about {programs[activeProgram].name}</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trending Courses Section */}
      <section className="trending-courses-section">
        <div className="container">
          <div className="trending-header">
            <h2>Popular now</h2>
            <button className="see-all-btn">See all</button>
          </div>
          <div className="courses-scroll-container">
            <div className="courses-scroll">
              {trendingCourses.map((course) => (
                <div key={course.id} className="course-card">
                  <div className="course-image">
                    <div className="course-icon">{course.image}</div>
                    {course.badge && <span className={`course-badge ${course.badge.toLowerCase()}`}>{course.badge}</span>}
                  </div>
                  <div className="course-content">
                    <h3 className="course-title">{course.title}</h3>
                    <p className="course-instructor">{course.instructor}</p>
                    <div className="course-meta">
                      <span className="course-duration">{course.duration}</span>
                      <span className="course-episodes">{course.episodes}</span>
                    </div>
                    <p className="course-description">{course.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="scroll-indicators">
            <button className="scroll-btn prev" aria-label="Previous courses">‹</button>
            <button className="scroll-btn next" aria-label="Next courses">›</button>
          </div>
        </div>
      </section>

      <main className="main-content">
        {/* Enrollment Options */}
        <section className="enrollment-section">
          <div className="container">
            <div className="enrollment-grid">
              <div className="enrollment-info">
                <h2>Enrollment Options</h2>
                <p>For non-credit enrollment, register here or email us at Support@AHSOnline.org</p>
                <ul className="enrollment-features">
                  <li>✓ Flexible scheduling</li>
                  <li>✓ Accredited courses</li>
                  <li>✓ Live mentoring</li>
                  <li>✓ Faith-based curriculum</li>
                </ul>
              </div>
              <div className="enrollment-actions">
                <div className="enrollment-links">
                  <a href="#" className="enrollment-btn primary">New Family Registration</a>
                  <a href="#" className="enrollment-btn">Returning Student Enrollment</a>
                  <a href="#" className="enrollment-btn">Register for Courses</a>
                  <a href="#" className="enrollment-btn">Student Reenrollment Login</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Interface Preview */}
        <section className="course-preview-section">
          <div className="container">
            <div className="course-preview-content">
              <div className="course-preview-text">
                <h2>Intuitive Course Management</h2>
                <p>Our user-friendly platform makes it easy to track progress, submit assignments, and stay connected with mentors.</p>
                <ul className="preview-features">
                  <li>📚 Interactive course materials</li>
                  <li>📊 Real-time progress tracking</li>
                  <li>💬 Direct mentor communication</li>
                  <li>📝 Streamlined assignment submission</li>
                </ul>
              </div>
              <div className="course-preview-image">
                <div className="course-interface">
                  <div className="interface-header">
                    <div className="interface-tabs">
                      <span className="tab active">Courses</span>
                      <span className="tab">Assignments</span>
                      <span className="tab">Grades</span>
                    </div>
                  </div>
                  <div className="interface-content">
                    <div className="course-list">
                      <div className="course-item active">
                        <span className="course-name">Constitutional Studies</span>
                        <span className="course-progress">85%</span>
                      </div>
                      <div className="course-item">
                        <span className="course-name">Literature: Self Governance</span>
                        <span className="course-progress">72%</span>
                      </div>
                      <div className="course-item">
                        <span className="course-name">American Government</span>
                        <span className="course-progress">91%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="features-section">
          <div className="container">
            <div className="features-header">
              <h2>A Better Way to Learn</h2>
              <p>Experience the difference with our comprehensive approach to online education</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-image">
                  <div className="feature-placeholder">👨‍🏫</div>
                </div>
                <h3>Live Mentors</h3>
                <p>Foster meaningful interactions rooted in beliefs in Jesus Christ through live classes and one-on-one mentoring sessions.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              <div className="feature-card">
                <div className="feature-image">
                  <div className="feature-placeholder">📖</div>
                </div>
                <h3>Faith-Based Curriculum</h3>
                <p>Our transformative curriculum blends academic rigor with gospel-infused content to inspire and empower scholars.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              <div className="feature-card">
                <div className="feature-image">
                  <div className="feature-placeholder">🎓</div>
                </div>
                <h3>Accredited Diploma</h3>
                <p>Earn an actual American Heritage diploma once you've completed 25 credits. Credits can be combined with existing high school work.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              <div className="feature-card">
                <div className="feature-image">
                  <div className="feature-placeholder">🏫</div>
                </div>
                <h3>55+ Years Experience</h3>
                <p>American Heritage Online High School is an extension of our physical campuses located in American Fork & Salt Lake City Utah.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
            </div>
          </div>
        </section>

        {/* Courses Offered */}
        <section className="courses-section">
          <div className="container">
            <h2>Courses Offered</h2>
            <div className="courses-categories">
              <div className="course-category">
                <h3>Core Subjects</h3>
                <div className="course-list">
                  {courses.slice(0, 12).map((course, index) => (
                    <div key={index} className="course-item">
                      <span className="course-name">{course}</span>
                      <span className="course-credits">0.5 credits</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="course-category">
                <h3>Electives & Specializations</h3>
                <div className="course-list">
                  {courses.slice(12, 24).map((course, index) => (
                    <div key={index} className="course-item">
                      <span className="course-name">{course}</span>
                      <span className="course-credits">0.5 credits</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="course-category">
                <h3>Advanced Studies</h3>
                <div className="course-list">
                  {courses.slice(24).map((course, index) => (
                    <div key={index} className="course-item">
                      <span className="course-name">{course}</span>
                      <span className="course-credits">0.5 credits</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="courses-cta">
              <a href="#" className="see-more-btn">View Complete Course Catalog</a>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <div className="container">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-item">
                  <button 
                    className={`faq-question ${expandedFaq === index ? 'active' : ''}`}
                    onClick={() => toggleFaq(index)}
                  >
                    {faq.question}
                    <span className="faq-toggle">{expandedFaq === index ? '−' : '+'}</span>
                  </button>
                  {expandedFaq === index && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="cta-section">
          <div className="container">
            <h2>Looking to get started?</h2>
            <p>Start the registration process today.</p>
            <a href="#" className="cta-btn">Start Registration</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 American Heritage Online High School</p>
          <a href="../" className="back-link">← Back to heyspence.me</a>
        </div>
      </footer>

      {/* Floating Mentor Chat Popup */}
      <div className="mentor-chat-popup">
        <div className="mentor-chat-icon">💬</div>
        <span className="mentor-chat-text">Talk with a course mentor</span>
      </div>
    </div>
  );
}

export default App;
