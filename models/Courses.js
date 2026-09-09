import mongoose from "mongoose";

const coursesSchema = new mongoose.Schema({
     hero: [{
          startheading: String,
          endheading: String,
     }],
     course: [{
          image: String,
          alt:String,
          title: String,
          seotitle:String,
          seodescription:String,
          slug: String,
          author: String,
          startdate: String,
          category: String,
          duration: String,
          mode: String,
          batchSize: String,
          socialProof: [{
               iconName: String,
               name: String,
               value: String
          }],
          overview: String,
          promoTitle: String,
          promoDescription: String,
          promoBenefits: String,
          promoSocialBottomContent: String,
          brochureTitle: String,
          brochureSubtext: String,
          brochurePhones: String,
          brochureLink: String,
          skillsYouWillLearn: {
               title: String,
               skills: [String]
          },
          videos: [{
               video: String,
               alt: String,
               title: String,
               thumbnail: String
          }],
          chapter:[ {
               chaptername: String,
               lessons: [{
                    lessonname: String
               }]
          }],
          faq: {
               title: String,
               startheading: String,
               midheading: String,
               endheading: String,
               description: String,
               items: [{
                    ques: String,
                    ans: String
               }]
          },
          shortTerm: {
               title: String,
               description: String,
               items: [{
                    title: String,
                    description: String,
                    duration: String,
                    iconText: String,
                    image: String,
                    alt: String
               }]
          },
          caseStudies: {
               title: String,
               description: String,
               buttonText: String,
               items: [{
                    image: String,
                    alt: String,
                    link: String
               }]
          },
          careerDomains: {
               title: String,
               description: String,
               items: [{
                    name: String,
                    link: String,
                    iconName: String,
                    color: String
               }]
          },
          trainers: {
               title: String,
               subtitle: String,
               items: [{
                    name: String,
                    role: String,
                    bio: String,
                    rating: String,
                    students: String,
                    image: String,
                    linkedin: String
               }]
          },
          jobRoles: {
               tag: String,
               title: String,
               description: String,
               items: [{
                    title: String,
                    description: String,
                    step: String,
                    iconName: String,
                    keyFocusTitle: String,
                    keyFocus: String
               }]
          },
          hiringPartners: {
               title: String,
               subtitle: String,
               items: [{
                    name: String,
                    image: String
               }]
          },
          chooseLearning: {
               title: String,
               subtitle: String,
               emi: {
                    title: String,
                    subtitle: String,
                    bannerTitle: String,
                    bannerSubtitle: String,
                    points: [String]
               },
               scholarship: {
                    title: String,
                    subtitle: String,
                    discountAmount: String,
                    discountLabel: String,
                    discountText: String,
                    discountSubtext: String,
                    meritTitle: String,
                    meritSubtitle: String,
                    points: [String]
               },
               batches: {
                    title: String,
                    subtitle: String,
                    items: [{
                         dayDate: String,
                         month: String,
                         title: String,
                         time: String,
                         status: String
                    }]
               }
          },
          whyChooseUs: {
               title: String,
               subtitle: String,
               items: [{
                    title: String,
                    description: String,
                    iconName: String,
                    color: String
               }]
          },
          readyToStartJourney: {
               title: String,
               subtitle: String,
               button1Text: String,
               button1Link: String,
               button2Text: String,
               button2Link: String
          },
          schemas: [String],
          liveClass: {
               platform: String,
               meetUrl: String,
               startUrl: String,
               zoomMeetingId: String,
               passcode: String,
               title: String,
               scheduledAt: String,
               instructions: String,
               active: Boolean,
               updatedAt: Date
          },
          recordings: [{
               id: String,
               title: String,
               videoUrl: String,
               downloadUrl: String,
               duration: String,
               meetingId: String,
               createdAt: { type: Date, default: Date.now }
          }]
     }],
     card: {
          title: String,
          description: String,
          buttonname: String
     },
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     },
     caseStudies: {
          title: String,
          description: String,
          buttonText: String,
          items: [{
               image: String,
               alt: String,
               link: String
          }]
     },
     careerDomains: {
          title: String,
          description: String,
          items: [{
               name: String,
               link: String,
               iconName: String,
               color: String
          }]
     }
}, { timestamps: true });

const Courses = mongoose.models.Courses || mongoose.model("Courses", coursesSchema);

export default Courses;
