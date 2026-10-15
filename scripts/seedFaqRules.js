import "dotenv/config";
import mongoose from "mongoose";
import AutoFaqRule from "../models/AutoFaqRule.js";

export const WEEKEND_UX_FAQ_RULES = [
  {
    question: "Single Student Portfolio with Details & Name",
    keywords: [
      "portfolio",
      "student portfolio",
      "student work",
      "sample work",
      "projects",
      "past projects",
      "case study",
      "student name",
      "behance",
      "dribbble"
    ],
    matchType: "contains",
    answer: "You can explore real student portfolios along with complete project details and the student's name on our official website. All portfolios are built with live industry case studies under 1-on-1 mentor guidance.\n\n🌐 View Student Portfolios: https://weekendux.in/portfolio",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Video Portfolios Uploaded on Website & App",
    keywords: [
      "video portfolio",
      "video projects",
      "student video",
      "app portfolio",
      "video walkthrough",
      "video review",
      "prototype video",
      "app video"
    ],
    matchType: "contains",
    answer: "Yes! Complete video walkthroughs and project presentations by our students are uploaded directly on both the Weekend UX Website and Mobile App.\n\n📱 Download the Weekend UX App or visit https://weekendux.in to watch live student video portfolios & walkthroughs.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Software & Design Tools Trained by Mentors",
    keywords: [
      "software",
      "tools",
      "figma",
      "photoshop",
      "illustrator",
      "indesign",
      "canva",
      "tools taught",
      "software training",
      "which software",
      "graphic tools",
      "ui tools"
    ],
    matchType: "contains",
    answer: "Our industry expert mentors provide practical, hands-on training on all industry-standard software across our programs:\n\n• UI/UX Design: Figma, FigJam, Prototyping tools & Generative AI workflows\n• Graphic Design: Adobe Photoshop, Adobe Illustrator, InDesign & Canva\n\nAll tools are trained with real-world assignments and design systems.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Mode of Classes (Online Only - Offline Not Available Currently)",
    keywords: [
      "offline",
      "offline classes",
      "classroom",
      "centre",
      "center",
      "location",
      "in person",
      "offline batch",
      "physical class",
      "face to face"
    ],
    matchType: "contains",
    answer: "Currently, offline classes are not available. We conduct high-engagement, LIVE Interactive Online classes with direct screen sharing, live doubts clearing, and 1-on-1 mentor support. 💻\n\nWhenever offline classes become available, we will announce updates to all students.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "EMI Option & Registration Fee Policy (10k Initial Payment)",
    keywords: [
      "emi",
      "installment",
      "monthly payment",
      "registration charges",
      "10k",
      "10000",
      "part payment",
      "split payment",
      "emi option",
      "down payment"
    ],
    matchType: "contains",
    answer: "Yes, an EMI option is available for our courses! 💳\n\nEMI Guidelines:\n1. A one-time initial registration payment of ₹10,000 is required to secure your seat.\n2. Once registered, your customized monthly EMI schedule will be activated after discussion with the Weekend UX team.\n\nReply with your Phone Number to discuss your flexible EMI plan with our admissions counselor!",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Course Duration & Batches (Weekend vs Weekday Schedules)",
    keywords: [
      "duration",
      "timing",
      "timings",
      "schedule",
      "batch",
      "weekend batch",
      "weekday batch",
      "batch timings",
      "how long",
      "kitne time",
      "kab start hoga"
    ],
    matchType: "contains",
    answer: "We offer flexible cohort schedules designed for working professionals and college students:\n\n🗓️ Weekend Cohort: Saturday & Sunday live interactive sessions\n🗓️ Weekday Cohort: Regular weekday evening batches\n\nCourse duration typically ranges from 3 to 6 months depending on your program. All live sessions are recorded and accessible anytime on your LMS dashboard.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Fast-Track Accelerated Course Option",
    keywords: [
      "fast track",
      "fasttrack",
      "crash course",
      "express batch",
      "speed course",
      "quick course",
      "jaldi",
      "accelerated"
    ],
    matchType: "contains",
    answer: "Yes! ⚡ Fast-track accelerated course options are available across all our courses for students and working professionals looking for rapid upskilling.\n\nPlease connect with the Weekend UX team to discuss your target completion timeline and enroll in an upcoming fast-track cohort.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Job Placement & Career Support (Skill-Dependent Policy)",
    keywords: [
      "placement",
      "job",
      "job guarantee",
      "career",
      "hiring",
      "interview",
      "package",
      "placement support",
      "job assistance",
      "job placement"
    ],
    matchType: "contains",
    answer: "Job placement ultimately depends on your individual skills, dedication, and knowledge. 💼\n\nWeekend UX provides end-to-end career guidance:\n• Direct interview connections with hiring partner companies\n• 1-on-1 Portfolio review and curation\n• Professional Resume preparation guidance\n• Mock interviews & crack-the-interview training to help you tackle design challenges.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Fee Refund Policy (Strictly Non-Refundable)",
    keywords: [
      "refund",
      "money back",
      "cancellation",
      "cancel",
      "refundable",
      "return fee",
      "paise wapas",
      "refund policy"
    ],
    matchType: "contains",
    answer: "Please note that course fees and registration payments are strictly Non-Refundable in any case. ⚠️\n\nWe request all prospective students to check the course brochure and clarify all questions with the Weekend UX team prior to making any payment.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Help & Support - Weekend UX Genie Chatbot",
    keywords: [
      "support",
      "help",
      "genie",
      "chatbot",
      "contact",
      "customer care",
      "helpdesk",
      "assistance",
      "help and support"
    ],
    matchType: "contains",
    answer: "For all help, admissions guidance, and student support, you can connect directly with our 'Weekend UX Genie Chatbot' available 24/7 on our official website: https://weekendux.in 🤖\n\nOur team is also active on email and chat to resolve your queries.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Course Fee Discounts (75% to 90% Off)",
    keywords: [
      "discount",
      "offer",
      "discount offer",
      "75%",
      "90%",
      "coupon",
      "concession",
      "fees discount",
      "kitna discount",
      "special offer"
    ],
    matchType: "contains",
    answer: "All our courses currently have attractive 75% to 90% discounts available, depending on the specific course and cohort! 🏷️\n\nPlease consult with the Weekend UX admissions team to check the exact discount applicable to your selected course.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Merit Scholarships (5 Students/Year - 95% in Proctored MCQ Exam)",
    keywords: [
      "scholarship",
      "free seat",
      "scholarships",
      "merit scholarship",
      "95%",
      "mcq",
      "proctored",
      "scholarship exam",
      "test",
      "proctored test"
    ],
    matchType: "contains",
    answer: "Weekend UX offers Merit Scholarships for up to 5 students per year! 🎓\n\nEligibility Criteria:\n• Candidates must score 95% or higher in our official proctored online MCQ assessment exam.\n\nReply with 'SCHOLARSHIP' or contact the Weekend UX team to apply and book your proctored test slot.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Remove old rules
  const deleteResult = await AutoFaqRule.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} old FAQ rules from database.`);

  // Insert the 12 new rules
  const inserted = await AutoFaqRule.insertMany(WEEKEND_UX_FAQ_RULES);
  console.log(`✅ Successfully inserted ${inserted.length} new FAQ rules into MongoDB!`);

  // Verify
  const allRules = await AutoFaqRule.find({}, "question keywords channels").lean();
  console.log("\nNew Active FAQ Rules in DB:");
  allRules.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.question} (Keywords: ${r.keywords.length}) [${r.channels.join(", ")}]`);
  });

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
