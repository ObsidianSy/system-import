# Configurações de Segurança

## ⚠️ IMPORTANTE - Lista de Verificação de Segurança

### Antes de Deploy em Produção:

#### 1. Variáveis de Ambiente (.env)
- [ ] `DEV_AUTO_LOGIN=false` - **CRÍTICO**: Nunca habilitar em produção
- [ ] `JWT_SECRET` - Alterar para uma chave forte e única (mínimo 32 caracteres aleatórios)
- [ ] `DATABASE_URL` - Usar credenciais específicas de produção
- [ ] `OPENAI_API_KEY` - Usar chave de produção (se aplicável)

#### 2. Banco de Dados
- [ ] Criar usuário específico para a aplicação (não usar usuário root)
- [ ] Configurar firewall para aceitar conexões apenas de IPs específicos
- [ ] Habilitar SSL/TLS para conexões ao banco de dados
- [ ] Fazer backup automático regular

#### 3. Autenticação e Autorização
- [ ] Política de senhas fortes implementada (mínimo 8 caracteres)
- [ ] Cookies com flags `httpOnly`, `secure`, `sameSite=strict`
- [ ] Rate limiting em endpoints de autenticação
- [ ] Logs de tentativas de login (sucesso e falha)

#### 4. Servidor
- [ ] HTTPS habilitado (certificado SSL válido)
- [ ] Headers de segurança configurados (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Versão do Node.js atualizada
- [ ] Dependências sem vulnerabilidades conhecidas (`pnpm audit`)
- [ ] Logs centralizados e monitoramento

#### 5. Código
- [ ] Variáveis sensíveis nunca commitadas no Git
- [ ] `.env` listado no `.gitignore`
- [ ] Validação de entrada em todos os endpoints
- [ ] Tratamento adequado de erros (sem expor stack traces)
- [ ] CORS configurado corretamente

## 🔐 Configuração de JWT Seguro

Para gerar um JWT_SECRET seguro, use:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# PowerShell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
```

## 🚫 O que NUNCA fazer em Produção

1. **Nunca** habilite `DEV_AUTO_LOGIN=true`
2. **Nunca** use senhas fracas ou padrão
3. **Nunca** exponha endpoints de admin sem autenticação
4. **Nunca** desabilite validação de entrada
5. **Nunca** logue informações sensíveis (senhas, tokens)
6. **Nunca** use `console.log` para dados sensíveis

## 📋 Checklist de Deploy

### Pré-Deploy
```bash
# 1. Verificar vulnerabilidades
pnpm audit

# 2. Executar testes
pnpm test

# 3. Build de produção
pnpm build

# 4. Verificar variáveis de ambiente
cat .env | grep -E "DEV_AUTO_LOGIN|JWT_SECRET"
```

### Pós-Deploy
- [ ] Testar fluxo completo de autenticação
- [ ] Verificar logs de erro
- [ ] Monitorar performance
- [ ] Testar backup e restore
- [ ] Documentar procedimentos de rollback

## 🔍 Monitoramento

### Logs Importantes
- Tentativas de login falhas
- Criação/modificação/exclusão de usuários
- Acessos a endpoints administrativos
- Erros de autenticação/autorização
- Erros de banco de dados

### Alertas Recomendados
- Múltiplas tentativas de login falhas do mesmo IP
- Acesso a endpoints administrativos fora do horário
- Erros críticos de banco de dados
- Uso de CPU/memória acima de 80%
- Tempo de resposta acima de 2 segundos

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Última atualização:** Novembro 2025
