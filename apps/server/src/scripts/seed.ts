import type { OIDCProvider } from "../app-config.js";
import { hashPassword } from "../common.js";
import { db } from "../db.js";
import { env } from "../env.js";
import type { JsonValue } from "../lib.js";
import { Role, type User } from "../zenstack/models.js";

if (env.APP_ENV === "production") {
  throw new Error(
    "Refusing to run seed script in production (APP_ENV=production).",
  );
}

const SEED_PASSWORD = "password123";

// Fake issuers: the login page shows these buttons, but signing in with them fails.
const DUMMY_OIDC_PROVIDERS: OIDCProvider[] = [
  {
    id: "google",
    name: "Google",
    issuer: "https://accounts.google.example.com",
    clientId: "dummy-google-client",
    clientSecret: "dummy-secret",
    redirectUri: "http://localhost:5173/auth/callback",
    iconUrl: "https://www.google.com/favicon.ico",
  },
  {
    id: "github",
    name: "GitHub",
    issuer: "https://github.example.com",
    clientId: "dummy-github-client",
    clientSecret: "dummy-secret",
    redirectUri: "http://localhost:5173/auth/callback",
    iconUrl: "https://github.com/favicon.ico",
  },
  {
    id: "its",
    name: "Institut Teknologi Sepuluh Nopember",
    issuer: "https://sso.example.ac.id",
    clientId: "dummy-its-client",
    clientSecret: "dummy-secret",
    redirectUri: "http://localhost:5173/auth/callback",
  },
];

const APP_CONFIGS: Record<string, JsonValue> = {
  oidc_providers: DUMMY_OIDC_PROVIDERS as unknown as JsonValue,
  allowed_redirect_origins: [],
  maintenance: { enabled: false, message: null, until: null },
};

async function createUser(data: {
  username: string;
  name: string;
  email: string;
  role: Role;
}): Promise<User> {
  return db.user.create({
    data: { ...data, passwordHash: hashPassword(SEED_PASSWORD) },
  });
}

async function dropAll() {
  await db.$executeRaw`
    TRUNCATE TABLE
      "Post",
      "UserOidc",
      "File",
      "RefreshToken",
      "AppConfig",
      "User"
    CASCADE
  `;
  console.log("🗑️  Dropped all existing data.");
}

async function main() {
  console.log("🌱 Starting database seeding...");

  await dropAll();

  await db.appConfig.createMany({
    data: Object.entries(APP_CONFIGS).map(([key, value]) => ({ key, value })),
  });
  console.log(`⚙️  Seeded ${Object.keys(APP_CONFIGS).length} app configs.`);

  const admin = await createUser({
    username: "admin",
    name: "Admin",
    email: "admin@example.com",
    role: Role.ADMIN,
  });

  const USER_COUNT = 5;
  const users = await Promise.all(
    Array.from({ length: USER_COUNT }, (_, i) => i + 1).map((n) =>
      createUser({
        username: `user${n}`,
        name: `User ${n}`,
        email: `user${n}@example.com`,
        role: Role.USER,
      }),
    ),
  );

  // user1 already has the first dummy provider linked (profile shows "Linked")
  const [linkedProvider] = DUMMY_OIDC_PROVIDERS;
  await db.userOidc.create({
    data: {
      userId: users[0]!.id,
      issuer: linkedProvider!.issuer,
      sub: "dummy-sub-user1",
      userInfo: {
        sub: "dummy-sub-user1",
        name: users[0]!.name,
        email: users[0]!.email,
        preferred_username: users[0]!.username,
      },
    },
  });

  const everyone = [admin, ...users];
  await db.post.createMany({
    data: everyone.flatMap((u) => [
      { userId: u.id, content: `Hello from ${u.name}!` },
      {
        userId: u.id,
        content: `## Notes\n\n- Posted by **${u.username}**\n- Seeded content`,
      },
    ]),
  });
  console.log(`📝 Seeded ${everyone.length * 2} posts.`);

  console.log("✅ Seed complete. Logins (username / password):");
  console.log(`  ${admin.username} / ${SEED_PASSWORD}  (ADMIN)`);
  for (const user of users) {
    console.log(`  ${user.username} / ${SEED_PASSWORD}  (USER)`);
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e);
    await db.$disconnect();
    process.exit(1);
  });
