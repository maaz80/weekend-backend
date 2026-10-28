import HireFromUs from "../models/HireFromUs.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";
import { triggerFrontendBuild } from "../services/deployService.js";

const defaultContent = {
     hero: {
          eyebrow: "Hire From Us",
          heading: "Hire Job Ready Curated Candidates at Zero Cost",
          buttonText: "Start Your Journey",
          intro: "Weekend UX is a hands-on design school, in-person classes and structured recordings built for people who learn by doing, not watching.",
          benefits: [
               "Experience World Class Candidates",
               "Reduce your hiring time by 80%"
          ]
     },
     candidateSearch: {
          eyebrow: "Search the Candidates",
          headingStart: "Find The",
          headingHighlight: "Designer",
          headingEnd: "You Have Been Looking For.",
          roles: ["UI Designer", "UX Designer", "Industrial Designer", "Graphic Designer", "UI UX Designer", "Web Designer"],
          resultMessage: "Candidate search for \"{query}\" is coming soon."
     },
     recruiterBenefits: {
          headingStart: "Why Our Students Are Favored By",
          headingHighlight: "Recruiters",
          description: "Our students have gone on to build successful careers with leading organizations across diverse industries, showcasing the skills, knowledge, and confidence they gained through our programs.",
          benefits: [
               { title: "Lateral hiring at Zero Cost", description: "Build your ideal tech team with skilled professionals at no cost." },
               { title: "Lateral hiring at Zero Cost", description: "Build your ideal tech team with skilled professionals at no cost." },
               { title: "Lateral hiring at Zero Cost", description: "Build your ideal tech team with skilled professionals at no cost." }
          ]
     },
     hiringStats: {
          eyebrow: "Hiring Stats",
          headingStart: "Guaranteed Candidates For Multiple",
          headingHighlight: "Hiring",
          headingEnd: "Needs.",
          chartTitle: "Work Experience",
          experience: [
               { label: "Freshers", value: 18 },
               { label: "0-2 years", value: 22 },
               { label: "2-5 Years", value: 28 },
               { label: "5+ years", value: 32 }
          ]
     },
     candidatePools: {
          eyebrow: "Explore Candidate Pools",
          headingStart: "Explore",
          headingHighlight: "Candidates",
          headingEnd: "Across Skill Pools",
          actionLabel: "Explore Candidates",
          actionHref: "#candidate-search",
          pools: [
               { value: "340+", valueName: "Beginner Designers", description: "Across beginner, intermediate & advanced courses since 2019" },
               { value: "100+", valueName: "Intermediate Designers", description: "Across beginner, intermediate & advanced courses since 2019" },
               { value: "10+", valueName: "Senior Designers", description: "We've been offered bigger. We've always said no. Small is big." },
               { value: "5+", valueName: "Expert Designers", description: "Rated by students post-batch. No anonymous reviews, no inflation." }
          ]
     }
};

export const getHireFromUs = async () => {
     try {
          await connectDB();
          const data = await HireFromUs.findOne().lean();
          return NextResponse.json(data || defaultContent);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

export const updateHireFromUs = async (req) => {
     try {
          await connectDB();
          const { hero, candidateSearch, recruiterBenefits, hiringStats, candidatePools } = await req.json();

          if (!hero || !Array.isArray(hero.benefits) ||
               !candidateSearch || !Array.isArray(candidateSearch.roles) ||
               !recruiterBenefits || !Array.isArray(recruiterBenefits.benefits) ||
               !hiringStats || !Array.isArray(hiringStats.experience) ||
               hiringStats.experience.some((item) => !Number.isFinite(Number(item.value)) || Number(item.value) < 0 || Number(item.value) > 100) ||
               hiringStats.experience.reduce((total, item) => total + Number(item.value), 0) > 100 ||
               !candidatePools || !Array.isArray(candidatePools.pools)) {
               return NextResponse.json({ error: "Valid Hire From Us content, including candidate pool cards, is required. Hiring Stats percentages must be between 0 and 100 and total no more than 100%." }, { status: 400 });
          }

          const data = await HireFromUs.findOneAndUpdate(
               {},
               { $set: { hero, candidateSearch, recruiterBenefits, hiringStats, candidatePools } },
               { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
          );

          await triggerFrontendBuild();
          return NextResponse.json(data);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
