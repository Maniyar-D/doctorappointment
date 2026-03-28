import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

const parseAdminEmails = () => {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const isConfiguredAdminEmail = (email) => {
  if (!email) return false;
  return parseAdminEmails().includes(email.toLowerCase());
};

export const checkUser = async () => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      include: {
        transactions: {
          where: {
            type: "CREDIT_PURCHASE",
            // Only get transactions from current month
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (loggedInUser) {
      if (
        isConfiguredAdminEmail(loggedInUser.email) &&
        loggedInUser.role !== "ADMIN"
      ) {
        return await db.user.update({
          where: { id: loggedInUser.id },
          data: { role: "ADMIN" },
          include: {
            transactions: {
              where: {
                type: "CREDIT_PURCHASE",
                createdAt: {
                  gte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1
                  ),
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        });
      }
      return loggedInUser;
    }

    // Only hit Clerk API if user record does not exist in our DB yet
    const user = await currentUser();
    if (!user) {
      return null;
    }

    const name = `${user.firstName} ${user.lastName}`;
    const email = user.emailAddresses[0].emailAddress;
    const role = isConfiguredAdminEmail(email) ? "ADMIN" : undefined;

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email,
        ...(role ? { role } : {}),
        transactions: {
          create: {
            type: "CREDIT_PURCHASE",
            packageId: "free_user",
            amount: 0,
          },
        },
      },
    });

    return newUser;
  } catch (error) {
    // Avoid taking down the whole page when Clerk throttles currentUser calls
    if (error?.status === 429) {
      console.warn("Clerk rate limited checkUser request");
      return null;
    }

    console.log(error?.message || error);
    return null;
  }
};
