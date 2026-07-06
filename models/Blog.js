import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
     hero: {
          starttitle: String,
          endtitle: String
     },
     featuredblogs: {
          starttitle: String,
          endtitle: String

     },
     blogs: [{
          image: String,
          alt: String,
          title: String,
          seotitle: String,
          seodescription: String,
          slug: String,
          date: String,
          read: String,
          content: [{
               data: String
          }],
          featured: {
               type: Boolean,
               default: false
          },
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
     }]

}, { timestamps: true });

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

export default Blog;