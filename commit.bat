@echo off
echo ========================================
echo Fazendo commit das alteracoes...
echo ========================================

git add Dockerfile
git add .dockerignore
git add package.json
git add patches/
git add DEPLOY.md
git add SECURITY.md
git add .env.production
git add .gitignore
git add COMMIT-GUIDE.md

git commit -m "feat: Sistema implementado com PostgreSQL, Docker e patches corrigidos"

echo.
echo ========================================
echo Commit realizado! Agora faca o push:
echo git push origin main
echo ========================================
pause
