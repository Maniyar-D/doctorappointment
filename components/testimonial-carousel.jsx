"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SLIDES_TO_SHOW = 3;

export default function TestimonialCarousel({ testimonials = [] }) {
  const [current, setCurrent] = useState(0);

  // ✅ LOCAL DATA (ONLY FOR THIS SECTION — SAFE)
  const enhancedTestimonials = [
    {
      name: "Ayesha Khan",
      role: "Patient",
      initials: "AK",
      rating: 5,
      date: "2 days ago",
      quote:
        "Booking appointments has become super easy now. I didn’t have to wait in long queues, and everything was done within minutes from my phone."
    },
    {
      name: "Dr. Ahmed Raza",
      role: "Orthopedic",
      initials: "AR",
      rating: 5,
      date: "1 week ago",
      quote:
        "This platform has really improved how I manage my patients. I can now handle consultations efficiently without unnecessary delays."
    },
    {
      name: "Imran Shaikh",
      role: "Patient",
      initials: "IS",
      rating: 4,
      date: "5 days ago",
      quote:
        "The video consultation feature is honestly a lifesaver. I was able to get medical advice without taking leave from work."
    },
    {
      name: "Rahul Mehta",
      role: "Patient",
      initials: "RM",
      rating: 5,
      date: "3 days ago",
      quote:
        "I found the right specialist within minutes. The whole process felt smooth and well-organized."
    },
    {
      name: "Dr. Sana Ali",
      role: "Dermatologist",
      initials: "SA",
      rating: 5,
      date: "6 days ago",
      quote:
        "Very clean interface and easy to use. Even non-tech patients can book appointments without confusion."
    },
    {
      name: "Faizan Khan",
      role: "Patient",
      initials: "FK",
      rating: 4,
      date: "4 days ago",
      quote:
        "The UI is simple and responsive. Booking and joining consultations is hassle-free."
    },
    {
      name: "Zoya Shaikh",
      role: "Patient",
      initials: "ZS",
      rating: 5,
      date: "2 weeks ago",
      quote:
        "Everything works fast and smoothly. From searching doctors to booking, it takes just a few minutes."
    },
    {
      name: "Dr. Arjun Singh",
      role: "Neurologist",
      initials: "AS",
      rating: 5,
      date: "1 week ago",
      quote:
        "It helps streamline my workflow. Saves time and improves patient management."
    },
    {
      name: "Priya Verma",
      role: "Patient",
      initials: "PV",
      rating: 5,
      date: "3 days ago",
      quote:
        "I didn’t expect booking a doctor to be this easy. Everything feels quick and reliable."
    },
    {
      name: "Dr. Meera Iyer",
      role: "General Physician",
      initials: "MI",
      rating: 5,
      date: "1 week ago",
      quote:
        "Very intuitive platform. Reduces manual effort and improves efficiency."
    },
    {
      name: "Ali Hussain",
      role: "Patient",
      initials: "AH",
      rating: 4,
      date: "5 days ago",
      quote:
        "Appointments are now stress-free. I can book anytime without worrying about clinic timings."
    },
    {
      name: "Dr. Kabir Sharma",
      role: "Surgeon",
      initials: "KS",
      rating: 5,
      date: "2 weeks ago",
      quote:
        "Smooth workflow and good UI. Helps me focus more on patients."
    },
    {
      name: "Sameer Khan",
      role: "Patient",
      initials: "SK",
      rating: 5,
      date: "1 week ago",
      quote:
        "One of the best healthcare platforms I’ve used. Saves time and removes hassle."
    },
    {
      name: "Neha Kapoor",
      role: "Patient",
      initials: "NK",
      rating: 4,
      date: "6 days ago",
      quote:
        "Very convenient and reliable. Booking process is quick and simple."
    },
    {
      name: "Rohan Das",
      role: "Patient",
      initials: "RD",
      rating: 5,
      date: "3 days ago",
      quote:
        "Everything is well organized. I got consultation without any delay."
    }
  ];

  // 👉 FORCE 5 SLIDES (15 items)
  const finalTestimonials = enhancedTestimonials.slice(0, 15);

  const totalSlides = Math.ceil(finalTestimonials.length / SLIDES_TO_SHOW);

  // AUTO SLIDE
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % totalSlides);
    }, 4000);

    return () => clearInterval(interval);
  }, [totalSlides]);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrent((prev) =>
      prev === 0 ? totalSlides - 1 : prev - 1
    );
  };

  return (
    <div className="relative">

      {/* SLIDER */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${current * 100}%)`,
          }}
        >
          {Array.from({ length: totalSlides }).map((_, slideIndex) => (
            <div
              key={slideIndex}
              className="min-w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {finalTestimonials
                .slice(
                  slideIndex * SLIDES_TO_SHOW,
                  slideIndex * SLIDES_TO_SHOW + SLIDES_TO_SHOW
                )
                .map((testimonial, index) => (
                  <Card
                    key={index}
                    className="border-emerald-900/20 hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                  >
                    <CardContent className="pt-6">

                      {/* HEADER */}
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-900/20 flex items-center justify-center mr-4">
                          <span className="text-emerald-400 font-bold">
                            {testimonial.initials}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-white">
                            {testimonial.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {testimonial.role} • {testimonial.date}
                          </p>
                        </div>
                      </div>

                      {/* STARS */}
                      <div className="flex mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < testimonial.rating
                                ? "text-yellow-400"
                                : "text-gray-600"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      {/* TEXT */}
                      <p className="text-muted-foreground leading-relaxed">
                        "{testimonial.quote}"
                      </p>

                    </CardContent>
                  </Card>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* ARROWS */}
      <button
        onClick={prevSlide}
        className="absolute left-[-25px] top-1/2 -translate-y-1/2 bg-background border border-border p-2 rounded-full"
      >
        <ChevronLeft />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-[-25px] top-1/2 -translate-y-1/2 bg-background border border-border p-2 rounded-full"
      >
        <ChevronRight />
      </button>

      {/* DOTS */}
      <div className="flex justify-center mt-8 gap-2">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              current === i
                ? "bg-emerald-500 w-6"
                : "bg-muted-foreground/40 w-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}