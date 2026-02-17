.PHONY: up down logs ps rebuild

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

rebuild:
	docker compose build --no-cache
