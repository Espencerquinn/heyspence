import React, { useState } from 'react';
import './App.css';

function App() {
  const [expandedFaq, setExpandedFaq] = useState(null);

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
            <div className="logo-text">American Heritage</div>
          </div>
          <div className="nav-links">
            <a href="#">About</a>
            <a href="#">Courses</a>
            <a href="#">Admissions</a>
            <a href="#">Support</a>
            <button className="nav-cta">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">American Heritage Online</h1>
              <h3 className="hero-subtitle">Merge the faithful home with the faithful school.</h3>
              <p className="hero-description">
                American Heritage Online High School offers an educational experience that mirrors 
                the enriching environment of our world-class private school but makes it accessible 
                to students anywhere at a fraction of the cost.
              </p>
              <div className="hero-actions">
                <button className="hero-btn primary">Get Started</button>
                <button className="hero-btn secondary">Learn More</button>
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
    </div>
  );
}

export default App;
