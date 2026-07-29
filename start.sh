docker stop jet-router
docker rm jet-router
docker build -t jet-router .
docker run -d --name jet-router -p 20128:20128 --env-file .env -v jet-router-data:/app/data jet-router