# Import Manager - Guia de Deploy

## 📋 Pré-requisitos

- Docker instalado
- PostgreSQL database configurado
- Variáveis de ambiente configuradas

## 🚀 Deploy com Docker

### 1. Build da Imagem

```bash
docker build -t import-manager:latest .
```

### 2. Executar Container

```bash
docker run -d \
  --name import-manager \
  -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:port/db" \
  -e JWT_SECRET="your-secure-jwt-secret" \
  -e DEV_AUTO_LOGIN="false" \
  -e NODE_ENV="production" \
  import-manager:latest
```

### 3. Com Docker Compose

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/importdb
      - JWT_SECRET=your-secure-jwt-secret-change-this
      - DEV_AUTO_LOGIN=false
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=importdb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Execute:
```bash
docker-compose up -d
```

## 🔐 Configuração de Segurança

### Gerar JWT Secret Seguro

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64
```

### Criar Usuário Admin

Após o deploy, crie o usuário admin:

```bash
docker exec -it import-manager pnpm exec tsx create-admin.ts
```

Ou configure as variáveis antes do deploy:
```bash
# No .env ou variáveis de ambiente
ADMIN_EMAIL=seu@email.com
ADMIN_PASSWORD=senha-segura
```

## 📊 Health Check

O container inclui health check automático:
- Endpoint: `http://localhost:3000/api/trpc/system.health`
- Intervalo: 30 segundos
- Timeout: 3 segundos

## 🔍 Monitoramento

### Ver Logs

```bash
docker logs -f import-manager
```

### Verificar Status

```bash
docker ps | grep import-manager
```

### Executar Comandos

```bash
# Criar admin
docker exec -it import-manager pnpm exec tsx create-admin.ts

# Migrations
docker exec -it import-manager pnpm db:migrate
```

## 🌍 Variáveis de Ambiente

### Obrigatórias

- `DATABASE_URL` - Connection string do PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT (mínimo 32 caracteres)
- `PORT` - Porta do servidor (padrão: 3000)

### Opcionais

- `DEV_AUTO_LOGIN` - Auto-login em dev (false em produção)
- `DEV_USER_EMAIL` - Email para auto-login
- `OPENAI_API_KEY` - Chave da OpenAI (se usar IA)
- `NODE_ENV` - Ambiente (production/development)

### Frontend (Build time)

- `VITE_APP_ID` - ID da aplicação
- `VITE_APP_TITLE` - Título da aplicação
- `VITE_APP_LOGO` - URL do logo
- `VITE_OAUTH_PORTAL_URL` - URL do portal OAuth
- `VITE_ANALYTICS_ENDPOINT` - Endpoint de analytics
- `VITE_ANALYTICS_WEBSITE_ID` - ID do website analytics

## 🔄 Atualizações

### Atualizar Aplicação

```bash
# Pull nova versão
git pull

# Rebuild e restart
docker-compose down
docker-compose up -d --build
```

### Backup do Banco de Dados

```bash
# Backup
docker exec -t postgres_container pg_dump -U postgres importdb > backup.sql

# Restore
docker exec -i postgres_container psql -U postgres importdb < backup.sql
```

## ⚠️ Troubleshooting

### Container não inicia

```bash
# Verificar logs
docker logs import-manager

# Verificar variáveis
docker exec import-manager env
```

### Erro de conexão ao banco

```bash
# Testar conexão
docker exec import-manager node -e "require('postgres')('$DATABASE_URL').query('SELECT 1')"
```

### Permissões

```bash
# Container roda como usuário não-root (nodejs:1001)
# Certifique-se que volumes têm permissões corretas
```

## 📝 Checklist de Deploy

- [ ] PostgreSQL configurado e acessível
- [ ] JWT_SECRET gerado e configurado
- [ ] DEV_AUTO_LOGIN=false
- [ ] Variáveis de ambiente configuradas
- [ ] Build testado localmente
- [ ] Backup do banco de dados configurado
- [ ] Logs centralizados
- [ ] Health checks configurados
- [ ] SSL/TLS habilitado (via reverse proxy)
- [ ] Firewall configurado
- [ ] Usuário admin criado

## 🆘 Suporte

Para problemas, consulte:
- Logs: `docker logs import-manager`
- Health: `curl http://localhost:3000/api/trpc/system.health`
- Documentação: `SECURITY.md`

---

**Última atualização**: Novembro 2025
