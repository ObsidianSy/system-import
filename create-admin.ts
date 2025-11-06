import postgres from "postgres";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:084db4d9ee865a099ab2@72.60.147.138:3436/importdb";

async function createAdmin() {
  const sql = postgres(DATABASE_URL);
  
  try {
    const userId = randomBytes(16).toString("hex");
    const password = "admin123"; // Senha padrão
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Criando usuário admin...');
    
    await sql`
      INSERT INTO users (id, email, name, password, role, "loginMethod", "isActive", "createdAt", "lastSignedIn", "updatedAt")
      VALUES (
        ${userId},
        'vitorandrade1937@gmail.com',
        'Vitor Andrade',
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
    
    console.log('✅ Usuário admin criado/atualizado com sucesso!');
    console.log('📧 Email: vitorandrade1937@gmail.com');
    console.log('🔑 Senha: admin123');
    console.log('👤 Nome: Vitor Andrade');
    console.log('� Role: admin');
    console.log('🆔 ID:', userId);
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
  } finally {
    await sql.end();
  }
}

createAdmin();
