web: gunicorn --chdir backend config.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
release: python backend/manage.py migrate --noinput
