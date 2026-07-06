import mongoose from "mongoose";

const navbarSchema = new mongoose.Schema({

     logo: {
          image: String,
          alt: String
     },

     searchPlaceholder: String,

     dropdownName: String, //more

     loginButtonName: String,
     
     authDecorativeImage: String,

     moreItems: {
          title: String,
          dropdown_items: [{
               title: String,
               items: [{
                    name: String,
                    link: String
               }]
          }]
     }


}, { timestamps: true });

const Navbar = mongoose.models.Navbar || mongoose.model("Navbar", navbarSchema);

export default Navbar;