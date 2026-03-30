"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Why choose ClinicConnect over others?",
    a: "We provide fast booking, real-time doctor availability, and a seamless healthcare experience.",
  },
  {
    q: "Why avoid unnecessary surgery?",
    a: "Non-surgical treatments often reduce risk, cost, and recovery time while still being effective.",
  },
  {
    q: "Does insurance cover treatments?",
    a: "Yes, we support multiple providers and most treatments are covered.",
  },
  {
    q: "When can I return to work?",
    a: "Most treatments allow quick recovery depending on the condition.",
  },
];
export default function FAQSection() {
  const [open, setOpen] = useState(null);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Title */}
        <h2 className="text-4xl font-bold text-center mb-12 gradient-title">
          FAQ's
        </h2>

        {/* Items */}
        <div className="space-y-4">
          {faqs.map((item, i) => {
            const isOpen = open === i;

            return (
              <div
                key={i}
                className="rounded-xl border border-border bg-card/60 backdrop-blur-lg p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-md"
              >
                {/* Question */}
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex justify-between items-center w-full text-left"
                >
                  <span className="font-semibold text-base md:text-lg">
                    {item.q}
                  </span>

                  <ChevronDown
                    className={`transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-40 mt-3" : "max-h-0"
                  }`}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}