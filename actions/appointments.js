"use server";

import fs from "fs";
import path from "path";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Vonage } from "@vonage/server-sdk";
import { addDays, addMinutes, format, isBefore, endOfDay } from "date-fns";
import { Auth } from "@vonage/auth";

const getVonageApplicationId = () =>
  process.env.VONAGE_APPLICATION_ID ||
  process.env.NEXT_PUBLIC_VONAGE_APPLICATION_ID ||
  "";

const getVonagePrivateKey = () => {
  const raw = (process.env.VONAGE_PRIVATE_KEY || "").trim();
  if (!raw) return "";

  // Supports multiline value stored as escaped newlines in .env
  const normalized = raw.replace(/\\n/g, "\n");
  if (normalized.includes("BEGIN PRIVATE KEY")) {
    return normalized;
  }

  // Supports private key file path in .env (absolute or project-relative)
  const resolvedPath = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  if (fs.existsSync(resolvedPath)) {
    return fs.readFileSync(resolvedPath, "utf8");
  }

  return normalized;
};

// Initialize Vonage Video API client
const VONAGE_APPLICATION_ID = getVonageApplicationId();
const VONAGE_PRIVATE_KEY = getVonagePrivateKey();

const credentials = new Auth({
  applicationId: VONAGE_APPLICATION_ID,
  privateKey: VONAGE_PRIVATE_KEY,
});
const options = {};
const vonage = new Vonage(credentials, options);

const assertVonageConfigured = () => {
  if (!VONAGE_APPLICATION_ID || !VONAGE_PRIVATE_KEY) {
    throw new Error(
      "Vonage is not configured. Set VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY."
    );
  }

  if (!VONAGE_PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "Invalid VONAGE_PRIVATE_KEY. Use full PEM content (with BEGIN PRIVATE KEY) or a valid file path."
    );
  }
};

/**
 * Book a new appointment with a doctor
 */
export async function bookAppointment(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the patient user
    const patient = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "PATIENT",
      },
    });

    if (!patient) {
      throw new Error("Patient not found");
    }

    // Parse form data
    const doctorId = formData.get("doctorId");
    const startTime = new Date(formData.get("startTime"));
    const endTime = new Date(formData.get("endTime"));
    const patientDescription = formData.get("description") || null;

    // Validate input
    if (!doctorId || !startTime || !endTime) {
      throw new Error("Doctor, start time, and end time are required");
    }

    // Check if the doctor exists and is verified
    const doctor = await db.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
      },
    });

    if (!doctor) {
      throw new Error("Doctor not found or not verified");
    }

    // Check if the requested time slot is available
    const overlappingAppointment = await db.appointment.findFirst({
      where: {
        doctorId: doctorId,
        status: "SCHEDULED",
        OR: [
          {
            // New appointment starts during an existing appointment
            startTime: {
              lte: startTime,
            },
            endTime: {
              gt: startTime,
            },
          },
          {
            // New appointment ends during an existing appointment
            startTime: {
              lt: endTime,
            },
            endTime: {
              gte: endTime,
            },
          },
          {
            // New appointment completely overlaps an existing appointment
            startTime: {
              gte: startTime,
            },
            endTime: {
              lte: endTime,
            },
          },
        ],
      },
    });

    if (overlappingAppointment) {
      throw new Error("This time slot is already booked");
    }

    // Create a new Vonage Video API session
    const sessionId = await createVideoSession();

    // Create the appointment with the video session ID
    const appointment = await db.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        startTime,
        endTime,
        patientDescription,
        status: "SCHEDULED",
        videoSessionId: sessionId, // Store the Vonage session ID
      },
    });

    revalidatePath("/appointments");
    return { success: true, appointment: appointment };
  } catch (error) {
    console.error("Failed to book appointment:", error);
    throw new Error("Failed to book appointment:" + error.message);
  }
}

/**
 * Generate a Vonage Video API session
 */
async function createVideoSession() {
  try {
    assertVonageConfigured();
    const session = await vonage.video.createSession({ mediaMode: "routed" });
    return session.sessionId;
  } catch (error) {
    if (error?.response?.status === 401 || error?.status === 401) {
      throw new Error(
        "Vonage auth failed (401). Ensure VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY belong to the same Vonage Video app."
      );
    }
    throw new Error("Failed to create video session: " + error.message);
  }
}

/**
 * Generate a token for a video session
 * This will be called when either doctor or patient is about to join the call
 */
export async function generateVideoToken(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const appointmentId = formData.get("appointmentId");

    if (!appointmentId) {
      throw new Error("Appointment ID is required");
    }

    // Find the appointment and verify the user is part of it
    const appointment = await db.appointment.findUnique({
      where: {
        id: appointmentId,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Verify the user is either the doctor or the patient for this appointment
    if (appointment.doctorId !== user.id && appointment.patientId !== user.id) {
      throw new Error("You are not authorized to join this call");
    }

    // Verify the appointment is scheduled
    if (appointment.status !== "SCHEDULED") {
      throw new Error("This appointment is not currently scheduled");
    }

    // Verify the appointment is within a valid time range (e.g., starting 5 minutes before scheduled time)
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const timeDifference = (appointmentTime - now) / (1000 * 60); // difference in minutes

    if (timeDifference > 30) {
      throw new Error(
        "The call will be available 30 minutes before the scheduled time"
      );
    }

    // Generate a token for the video session
    // Token expires 2 hours after the appointment start time
    assertVonageConfigured();
    const appointmentEndTime = new Date(appointment.endTime);
    const expirationTime =
      Math.floor(appointmentEndTime.getTime() / 1000) + 60 * 60; // 1 hour after end time

    // Use user's name and role as connection data
    const connectionData = JSON.stringify({
      name: user.name,
      role: user.role,
      userId: user.id,
    });

    // Generate the token with appropriate role and expiration
    const token = vonage.video.generateClientToken(appointment.videoSessionId, {
      role: "publisher", // Both doctor and patient can publish streams
      expireTime: expirationTime,
      data: connectionData,
    });

    // Update the appointment with the token
    await db.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        videoSessionToken: token,
      },
    });

    return {
      success: true,
      videoSessionId: appointment.videoSessionId,
      token: token,
    };
  } catch (error) {
    console.error("Failed to generate video token:", error);
    throw new Error("Failed to generate video token:" + error.message);
  }
}

/**
 * Get doctor by ID
 */
export async function getDoctorById(doctorId) {
  try {
    const doctor = await db.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
      },
    });

    if (!doctor) {
      throw new Error("Doctor not found");
    }

    return { doctor };
  } catch (error) {
    console.error("Failed to fetch doctor:", error);
    throw new Error("Failed to fetch doctor details");
  }
}

/**
 * Get available time slots for booking for the next 4 days
 */
export async function getAvailableTimeSlots(doctorId) {
  try {
    // Validate doctor existence and verification
    const doctor = await db.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
      },
    });

    if (!doctor) {
      throw new Error("Doctor not found or not verified");
    }

    // Fetch a single availability record
    const availability = await db.availability.findFirst({
      where: {
        doctorId: doctor.id,
        status: "AVAILABLE",
      },
    });

    // Get the next 4 days
    const now = new Date();
    const days = [now, addDays(now, 1), addDays(now, 2), addDays(now, 3)];

    // If doctor has not set availability yet, return empty day buckets
    if (!availability) {
      const emptyDays = days.map((day) => ({
        date: format(day, "yyyy-MM-dd"),
        displayDate: format(day, "EEEE, MMMM d"),
        slots: [],
      }));

      return { days: emptyDays };
    }

    // Fetch existing appointments for the doctor over the next 4 days
    const lastDay = endOfDay(days[3]);
    const existingAppointments = await db.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: "SCHEDULED",
        startTime: {
          lte: lastDay,
        },
      },
    });

    const availableSlotsByDay = {};

    // For each of the next 4 days, generate available slots
    for (const day of days) {
      const dayString = format(day, "yyyy-MM-dd");
      availableSlotsByDay[dayString] = [];

      // Create a copy of the availability start/end times for this day
      const availabilityStart = new Date(availability.startTime);
      const availabilityEnd = new Date(availability.endTime);

      // Set the day to the current day we're processing
      availabilityStart.setFullYear(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );
      availabilityEnd.setFullYear(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );

      let current = new Date(availabilityStart);
      const end = new Date(availabilityEnd);

      while (
        isBefore(addMinutes(current, 30), end) ||
        +addMinutes(current, 30) === +end
      ) {
        const next = addMinutes(current, 30);

        // Skip past slots
        if (isBefore(current, now)) {
          current = next;
          continue;
        }

        const overlaps = existingAppointments.some((appointment) => {
          const aStart = new Date(appointment.startTime);
          const aEnd = new Date(appointment.endTime);

          return (
            (current >= aStart && current < aEnd) ||
            (next > aStart && next <= aEnd) ||
            (current <= aStart && next >= aEnd)
          );
        });

        if (!overlaps) {
          availableSlotsByDay[dayString].push({
            startTime: current.toISOString(),
            endTime: next.toISOString(),
            formatted: `${format(current, "h:mm a")} - ${format(
              next,
              "h:mm a"
            )}`,
            day: format(current, "EEEE, MMMM d"),
          });
        }

        current = next;
      }
    }

    // Convert to array of slots grouped by day for easier consumption by the UI
    const result = Object.entries(availableSlotsByDay).map(([date, slots]) => ({
      date,
      displayDate:
        slots.length > 0
          ? slots[0].day
          : format(new Date(date), "EEEE, MMMM d"),
      slots,
    }));

    return { days: result };
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    throw new Error("Failed to fetch available time slots: " + error.message);
  }
}
