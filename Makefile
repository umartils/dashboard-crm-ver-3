setup:
	cp -n backend/.env.example backend/.env || true
	cp -n frontend/.env.example frontend/.env.local || true
up:
	docker compose up --build
down:
	docker compose down
sync:
	curl -X POST http://localhost:8000/api/admin/sync -H 'x-internal-key: change-me-internal-key'
