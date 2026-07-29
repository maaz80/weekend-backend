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
          overview: String,
          promoTitle: String,
          promoDescription: String,
          promoBenefits: String,
          brochureTitle: String,
          brochureSubtext: String,
          brochurePhones: String,
          brochureLink: String,
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
                    iconText: String
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
          }

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
     }

}, { timestamps: true });

const Courses = mongoose.models.Courses || mongoose.model("Courses", coursesSchema);

export default Courses;
