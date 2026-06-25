// Validate required environment variables
const requiredEnvVars = {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("❌ ERROR: Missing required environment variables:");
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error("\nPlease configure these variables in EasyPanel > Ambiente");
  process.exit(1);
}

export const ENV = {
  cookieSecret: requiredEnvVars.JWT_SECRET!,
  databaseUrl: requiredEnvVars.DATABASE_URL!,
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000"),
  // auth.owlflow (login centralizado). Opcionais no boot — o serviço valida
  // presença e dá erro claro se faltarem; assim o servidor sobe mesmo sem elas.
  authOwlflow: {
    url: process.env.AUTH_OWLFLOW_URL || "",
    clientId: process.env.AUTH_OWLFLOW_CLIENT_ID || "",
    clientSecret: process.env.AUTH_OWLFLOW_CLIENT_SECRET || "",
  },
};
