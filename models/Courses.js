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
          courselength: String,
          totalstudents: String,
          levels: String,
          totallessons: String,
          startdate: String,
          duration: String,
          category: String,
          overview: String,
          chapter:[ {
               chaptername: String,
               totallessons: String,
               lessons: [{
                    lessonname: String,
                    video: {
                         videourl: String,
                         duration: String
                    }
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
