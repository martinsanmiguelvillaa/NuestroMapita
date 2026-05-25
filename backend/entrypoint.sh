#!/bin/bash
set -e

echo "⏳ Esperando a que MySQL esté disponible..."

# Intenta conectarse hasta que MySQL responda
until python -c "
import pymysql, os, sys
try:
    pymysql.connect(
        host=os.environ.get('DB_HOST', 'db'),
        user=os.environ.get('DB_USER', 'mapita'),
        password=os.environ.get('DB_PASSWORD', ''),
        database=os.environ.get('DB_NAME', 'nuestro_mapita'),
        port=int(os.environ.get('DB_PORT', 3306))
    )
    print('MySQL disponible.')
    sys.exit(0)
except Exception as e:
    print(f'MySQL no disponible: {e}')
    sys.exit(1)
" 2>/dev/null; do
    echo "   Reintentando en 3 segundos..."
    sleep 3
done

echo "📦 Aplicando migraciones de base de datos..."
alembic upgrade head

echo "🚀 Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
