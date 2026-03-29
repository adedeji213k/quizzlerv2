"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import unilag from "@/app/assets/unilag.png";
import ui from "@/app/assets/ui.png";
import unn from "@/app/assets/unn.png";
import oau from "@/app/assets/oau.png";
import abu from "@/app/assets/abu.png";

const schools = [unilag, ui, unn, oau, abu];

export default function SchoolCarousel() {
  const [index, setIndex] = useState(0);
  const visibleCount = 5; // number of logos visible at a time

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % schools.length);
    }, 2500); // scroll every 2.5s
    return () => clearInterval(interval);
  }, []);

  const getVisible = () => {
    // Show the next `visibleCount` logos, wrapping around
    return Array.from(
      { length: visibleCount },
      (_, i) => schools[(index + i) % schools.length],
    );
  };

  const visibleSchools = getVisible();

  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Trusted by Students From</h2>
      </div>

      <div className="flex justify-center items-center gap-12 transition-all duration-700">
        {visibleSchools.map((logo, i) => (
          <div
            key={i}
            className="flex-shrink-0 transform transition-transform hover:scale-110"
          >
            <Image
              src={logo}
              alt="school logo"
              width={120}
              height={120}
              className="opacity-70 hover:opacity-100"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
