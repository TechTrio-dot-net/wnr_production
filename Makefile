.PHONY: help build up down restart logs ps clean migrate

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker compose build

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## View logs from all services
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-frontend: ## View frontend logs
	docker compose logs -f frontend

logs-adminui: ## View adminui logs
	docker compose logs -f adminui

ps: ## Show status of all containers
	docker compose ps

clean: ## Stop and remove all containers, networks, and volumes
	docker compose down -v
	docker system prune -f

migrate: ## Run database migrations
	docker compose exec backend npm run migrate-indexes

shell-backend: ## Access backend container shell
	docker compose exec backend sh

shell-frontend: ## Access frontend container shell
	docker compose exec frontend sh

shell-adminui: ## Access adminui container shell
	docker compose exec adminui sh

prod-build: ## Build for production
	docker compose -f docker-compose.prod.yml build

prod-up: ## Start production services
	docker compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	docker compose -f docker-compose.prod.yml down

prod-restart: ## Restart production services
	docker compose -f docker-compose.prod.yml restart

prod-logs: ## View production logs
	docker compose -f docker-compose.prod.yml logs -f

prod-deploy: ## Full production deployment (build + start)
	docker compose -f docker-compose.prod.yml up -d --build

stats: ## Show container resource usage
	docker stats

health: ## Check health of all services
	@echo "Backend Health:"
	@curl -s http://localhost:5001/health | jq . || echo "Backend not responding"
	@echo ""
	@echo "Frontend Health:"
	@curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 || echo "Frontend not responding"
	@echo ""
	@echo "Admin UI Health:"
	@curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001 || echo "Admin UI not responding"
