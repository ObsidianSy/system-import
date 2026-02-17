import "dotenv/config";
import postgres from "postgres";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD environment variable is required");
  process.exit(1);
}

async function createAdmin() {
  const sql = postgres(DATABASE_URL!);

  try {
    const userId = randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD!, 12);

    console.log('Criando usuario admin...');

    await sql`
      INSERT INTO users (id, email, name, password, role, "loginMethod", "isActive", "createdAt", "lastSignedIn", "updatedAt")
      VALUES (
        ${userId},
        ${ADMIN_EMAIL},
        ${ADMIN_NAME},
        ${hashedPassword},
        'admin',
        'password',
        true,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (email)
      DO UPDATE SET
        password = ${hashedPassword},
        role = 'admin',
        "isActive" = true,
        "updatedAt" = NOW()
    `;

    console.log('Usuario admin criado/atualizado com sucesso!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Nome:', ADMIN_NAME);
    console.log('\nIMPORTANTE: Altere a senha apos o primeiro login!');

  } catch (error) {
    console.error('Erro ao criar usuario:', error);
  } finally {
    await sql.end();
  }
}

createAdmin();
