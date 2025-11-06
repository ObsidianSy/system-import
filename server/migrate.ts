import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './database.db';
const db = new Database(dbPath);

console.log('Aplicando migrações...');

try {
  const migration = readFileSync(join(process.cwd(), 'drizzle', '0000_polite_sunspot.sql'), 'utf8');
  
  // Executar cada statement
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      db.exec(statement);
      console.log('✓ Statement executado com sucesso');
    } catch (err: any) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
      console.log('⚠ Tabela já existe, pulando...');
    }
  }
  
  console.log('✅ Migrações aplicadas com sucesso!');
} catch (error) {
  console.error('❌ Erro ao aplicar migrações:', error);
  process.exit(1);
} finally {
  db.close();
}
