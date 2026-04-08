# ENT EST Salé — Espace Numérique de Travail

> Projet de Fin d'Études — Dipolome Universitaire de Techonologie  
> École Supérieure de Technologie de Salé — Université Mohammed V de Rabat

---

## Table des matières

- [Présentation](#présentation)
- [Stack Technologique](#stack-technologique)
- [Architecture Microservices](#architecture-microservices)
- [Structure du Projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation et Démarrage (Développement)](#installation-et-démarrage-développement)
- [Variables d'environnement](#variables-denvironnement)
- [Services et Ports](#services-et-ports)
- [Comptes de test](#comptes-de-test)
- [Base de données Cassandra](#base-de-données-cassandra)
- [Stockage MinIO](#stockage-minio)
- [Notifications RabbitMQ](#notifications-rabbitmq)
- [API Gateway Nginx](#api-gateway-nginx)
- [Assistant IA — Ollama](#assistant-ia--ollama)
- [Déploiement Kubernetes](#déploiement-kubernetes)
- [Déploiement sur Serveur EST Salé](#déploiement-sur-serveur-est-salé)
- [Images Docker Hub](#images-docker-hub)
- [Commandes Utiles](#commandes-utiles)

---

## Présentation

L'ENT EST Salé est une plateforme numérique complète destinée à digitaliser et centraliser les activités pédagogiques de l'École Supérieure de Technologie de Salé. Il remplace un ENT monolithique existant par une solution moderne basée sur une **architecture microservices**, sécurisée via **Keycloak SSO**, déployée en **cloud privé** sur VMware ESXi, et augmentée par une **IA conversationnelle locale** (Ollama + Llama3).

### Fonctionnalités

| Fonctionnalité | Description |
|---------------|-------------|
| Authentification SSO | Login unique via Keycloak (OAuth2 / JWT RS256) |
| Gestion des cours | Upload, téléchargement, suppression de supports pédagogiques |
| Examens & Devoirs | Création, soumission, notation, téléchargement |
| Messagerie privée | Inbox, sent, envoi, notifications |
| Calendrier académique | Événements, planning, notifications globales |
| Chat temps réel | WebSocket par salons avec contrôle d'accès par rôle |
| Notifications | Bus RabbitMQ, badge temps réel, marquer lu/supprimer |
| Assistant IA | Chatbot Llama3 déployé localement via Ollama |
| FAQ | Base de connaissances avec recherche full-text |

### Rôles

| Rôle | Droits |
|------|--------|
| `etudiant` | Consulter cours/examens, soumettre rendus, messagerie, chat |
| `enseignant` | Créer cours/examens, noter rendus, créer événements calendrier |
| `admin` | Accès total — bypass automatique de tous les contrôles |

---

## Stack Technologique

### Backend
- **FastAPI** 0.109.0 (Python 3.11) — un microservice par fonctionnalité
- **Apache Cassandra** 4.1 — base de données NoSQL (7 keyspaces)
- **MinIO** — stockage fichiers S3-compatible (3 buckets)
- **Keycloak** 23.0 — Identity Provider SSO / OAuth2 / JWT
- **RabbitMQ** 3-management — bus de messages asynchrones
- **Nginx** — API Gateway / reverse proxy
- **Ollama + Llama3 8B** — IA conversationnelle locale

### Frontend
- **React** 18 + React Router v6
- **Axios** — requêtes HTTP + intercepteurs auto-refresh token
- **Lucide React** — icônes SVG
- **DM Sans** + **Playfair Display** — typographie Google Fonts
- Thème dark green custom (CSS variables)

### Infrastructure
- **Docker** 29+ + **Docker Compose** — développement
- **Kubernetes** (Minikube) — production
- **VMware ESXi** — hyperviseur bare metal cloud privé EST Salé
- **Ubuntu** 24.10 — OS des VMs de production
- **Docker Hub** — registry des images (`mehdiechchentili/*`)

---

## Architecture Microservices

```
[Browser :3000]
      │
      ▼
[Frontend React]
      │  HTTP / WebSocket
      ▼
[Gateway Nginx :80]  ← Point d'entrée unique
      │
      ├──► /api/users/         ──► [users-service         :8001]
      ├──► /api/courses/       ──► [courses-service       :8002]
      ├──► /api/messages/      ──► [messaging-service     :8003]
      ├──► /api/calendar/      ──► [calendar-service      :8004]
      ├──► /api/chat/          ──► [chat-service          :8005]
      ├──► /api/exams/         ──► [exams-service         :8006]
      ├──► /api/notifications/ ──► [notifications-service :8007]
      ├──► /api/ollama/        ──► [ollama                :11434]
      └──► /ws/chat/(.*)       ──► [chat-service          :8005] WebSocket

[courses/exams/messaging/calendar] ──publish──► [RabbitMQ: ent_notifications]
                                                          │
                                                     consume
                                                          │
                                                          ▼
                                             [notifications-service]
                                                          │
                                                          ▼
                                           [Cassandra ent_notifications]

[courses-service / exams-service] ◄──► [MinIO]
[Tous les services]               ◄──► [Cassandra]
[Tous les services]               ◄──► [Keycloak :8080]
```

---

## Structure du Projet

```
ENT-ESTS/
├── docker-compose.infra.yml          # Orchestration développement
├── build-and-push.ps1                # Script build + push Docker Hub
├── deploy-est.sh                     # Script déploiement VM Ubuntu
├── .env                              # Variables d'environnement
├── README.md
│
├── gateway/
│   ├── Dockerfile
│   └── nginx.conf                    # Config API Gateway
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── logo.webp
│   └── src/
│       ├── App.jsx                   # Router principal + ChatBot global
│       ├── index.js
│       ├── styles/
│       │   └── global.css            # Variables CSS + classes globales
│       ├── context/
│       │   └── AuthContext.jsx       # Contexte authentification React
│       ├── services/
│       │   └── api.js                # Toutes les fonctions API + Axios
│       ├── components/
│       │   ├── Layout/
│       │   │   └── Sidebar.jsx       # Navigation latérale
│       │   ├── ChatBot/
│       │   │   └── ChatBot.jsx       # Bulle IA flottante (Ollama)
│       │   └── NotificationBell.jsx  # Cloche notifications (polling 30s)
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Courses.jsx
│           ├── Exams.jsx
│           ├── Messaging.jsx
│           ├── Calendar.jsx
│           ├── Chat.jsx
│           └── FAQ.jsx
│
├── services/
│   ├── auth/
│   │   └── realm-export.json         # Config realm Keycloak (ent-est)
│   ├── users/                        # users-service :8001
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── routes.py
│   │       ├── auth.py               # Validation JWT locale RS256
│   │       ├── database.py           # Connexion Cassandra + init tables
│   │       └── models.py
│   ├── courses/                      # courses-service :8002
│   │   └── app/
│   │       ├── routes.py, auth.py, database.py, models.py
│   │       ├── minio_client.py       # Client MinIO + buckets
│   │       └── rabbitmq_publisher.py # Publication new_course
│   ├── messaging/                    # messaging-service :8003
│   │   └── app/
│   │       ├── routes.py, auth.py, database.py, models.py
│   │       └── rabbitmq_publisher.py # Publication new_message
│   ├── calendar/                     # calendar-service :8004
│   │   └── app/
│   │       ├── routes.py, auth.py, database.py, models.py
│   │       └── rabbitmq_publisher.py # Publication new_event
│   ├── chat/                         # chat-service :8005
│   │   └── app/
│   │       ├── routes.py, auth.py, database.py, models.py
│   │       └── manager.py            # ConnectionManager WebSocket
│   ├── exams/                        # exams-service :8006
│   │   └── app/
│   │       ├── routes.py, auth.py, database.py, models.py
│   │       ├── minio_client.py
│   │       └── rabbitmq_publisher.py # new_exam / exam_graded / submission_received
│   └── notifications/                # notifications-service :8007
│       ├── main.py                   # Lance consumer thread au startup
│       └── app/
│           ├── routes.py, auth.py, database.py
│           └── consumer.py           # Consumer RabbitMQ (thread daemon)
│
└── k8s/                              # Manifests Kubernetes
    ├── namespace.yaml                # Namespace: ent-est-sale
    ├── configmap.yaml                # Variables non-sensibles
    ├── secrets.yaml                  # Credentials chiffrés
    ├── infra/
    │   ├── cassandra.yaml            # StatefulSet + PVC 5Gi
    │   ├── minio.yaml                # Deployment + PVC 10Gi
    │   ├── rabbitmq.yaml             # Deployment
    │   ├── keycloak.yaml             # Deployment
    │   └── keycloak-realm-configmap.yaml
    ├── services/
    │   ├── users.yaml, courses.yaml, messaging.yaml
    │   ├── calendar.yaml, chat.yaml, exams.yaml
    │   ├── notifications.yaml
    │   └── ollama.yaml               # Deployment + PVC 10Gi
    ├── frontend/
    │   └── frontend.yaml
    └── gateway/
        └── gateway.yaml              # NodePort: 30080, 30300, 30808
```

---

## Prérequis

### Développement (Windows)
- Docker Desktop 29+
- Node.js 18+ (pour le frontend en dev local)
- PowerShell 7+

### Production (VM Ubuntu)
- Ubuntu 24.10
- Accès internet (installation automatique via `deploy-est.sh`)
- Minimum 8 Go RAM, 4 CPU, 30 Go disque

---

## Installation et Démarrage (Développement)

### 1. Cloner le projet

```bash
git clone https://github.com/mehdich1/ENT-ESTS-avant-deploy.git
cd ENT-ESTS-avant-deploy
```

### 2. Créer le fichier `.env`

```env
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin123
RABBITMQ_USER=admin
RABBITMQ_PASS=admin123
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

### 3. Démarrer tous les services

```powershell
docker-compose -f docker-compose.infra.yml up -d
```

### 4. Vérifier que tout est Up

```powershell
docker-compose -f docker-compose.infra.yml ps
```

### 5. Accéder à l'application

| Interface | URL |
|-----------|-----|
| Application | http://localhost:3000 |
| Keycloak Admin | http://localhost:8080 |
| RabbitMQ Console | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

---

## Variables d'environnement

Chaque microservice reçoit ces variables via Docker Compose :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `CASSANDRA_HOST` | `cassandra` | DNS Docker Cassandra |
| `KEYCLOAK_URL` | `http://keycloak:8080` | DNS Docker Keycloak (JAMAIS localhost) |
| `KEYCLOAK_REALM` | `ent-est` | Realm Keycloak |
| `RABBITMQ_HOST` | `rabbitmq` | DNS Docker RabbitMQ |
| `MINIO_HOST` | `minio` | DNS Docker MinIO |

> **Important** : Toujours utiliser les hostnames Docker internes, jamais `localhost` dans les variables des services backend.

---

## Services et Ports

| Service | Port interne | Port exposé | Description |
|---------|-------------|-------------|-------------|
| cassandra | 9042 | 9042 | Base de données |
| minio | 9000/9001 | 9000/9001 | Stockage + console |
| rabbitmq | 5672/15672 | 5672/15672 | Bus messages + console |
| keycloak | 8080 | 8080 | Identity Provider |
| users-service | 8001 | 8001 | Gestion utilisateurs |
| courses-service | 8002 | 8002 | Gestion cours |
| messaging-service | 8003 | 8003 | Messagerie privée |
| calendar-service | 8004 | 8004 | Calendrier |
| chat-service | 8005 | 8005 | Chat WebSocket |
| exams-service | 8006 | 8006 | Examens & devoirs |
| notifications-service | 8007 | 8007 | Notifications |
| gateway | 80 | 80 | API Gateway Nginx |
| frontend | 3000 | 3000 | Interface React |

---

## Comptes de test

| Username | Password | Rôle | UUID Cassandra |
|----------|----------|------|----------------|
| etudiant1 | etudiant123 | etudiant | 4fc67ba9-6b03-49aa-ad0a-35419da388f4 |
| enseignant1 | enseignant123 | enseignant | f1b426f7-e4af-49e5-b0ee-7ae7afdeb349 |
| admin1 | admin123 | admin | 6022d5b9-e378-4a6a-8cfc-0b793eced9a1 |

---

## Base de données Cassandra

### Keyspaces (7)

| Keyspace | Tables |
|----------|--------|
| `ent_users` | users |
| `ent_courses` | courses |
| `ent_exams` | exams, submissions |
| `ent_messaging` | messages |
| `ent_calendar` | events |
| `ent_chat` | chat_rooms, chat_messages |
| `ent_notifications` | notifications |

### Index secondaires

```sql
CREATE INDEX IF NOT EXISTS ON ent_notifications.notifications (user_id);
CREATE INDEX IF NOT EXISTS ON ent_exams.submissions (exam_id);
CREATE INDEX IF NOT EXISTS ON ent_exams.submissions (student_id);
CREATE INDEX IF NOT EXISTS ON ent_chat.chat_messages (room_id);
CREATE INDEX IF NOT EXISTS ON ent_messaging.messages (receiver_id);
CREATE INDEX IF NOT EXISTS ON ent_messaging.messages (sender_id);
```

### Salons chat par défaut

```sql
INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
VALUES (uuid(), 'general', 'Salon général', 'all', uuid(), toTimestamp(now()));
INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
VALUES (uuid(), 'enseignants', 'Salon enseignants', 'enseignant', uuid(), toTimestamp(now()));
INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
VALUES (uuid(), 'etudiants', 'Salon étudiants', 'etudiant', uuid(), toTimestamp(now()));
```

---

## Stockage MinIO

### Buckets

| Bucket | Contenu | Convention nommage |
|--------|---------|-------------------|
| `courses-files` | Fichiers de cours | `{course_id}/{filename}` |
| `exams-files` | Sujets d'examens | `{exam_id}/{filename}` |
| `devoirs-files` | Rendus étudiants | `{exam_id}/{student_id}/{filename}` |

### Formats acceptés
PDF, DOC, DOCX, PPTX, XLSX, ZIP, JPG, PNG — **taille max : 50 Mo**

---

## Notifications RabbitMQ

### Configuration
- **Exchange** : `ent_notifications` (type: topic, durable)
- **Queue** : `notifications_queue` (durable, routing_key: `#`)
- **Credentials** : admin / admin123

### Événements

| Événement | Publisher | Destinataires |
|-----------|-----------|---------------|
| `new_course` | courses-service | Tous les étudiants |
| `new_exam` | exams-service | Tous les étudiants |
| `new_message` | messaging-service | receiver_id uniquement |
| `new_event` | calendar-service | Tous les utilisateurs |
| `exam_graded` | exams-service | student_id concerné |
| `submission_received` | exams-service | teacher_id concerné |

---

## API Gateway Nginx

### Routes configurées

| Prefix | Service | Port |
|--------|---------|------|
| `/api/users/` | users-service | 8001 |
| `/api/courses/` | courses-service | 8002 |
| `/api/messages/` | messaging-service | 8003 |
| `/api/calendar/` | calendar-service | 8004 |
| `/api/chat/` | chat-service | 8005 |
| `/api/exams/` | exams-service | 8006 |
| `/api/notifications/` | notifications-service | 8007 |
| `/api/ollama/` | ollama | 11434 |
| `/ws/chat/` | chat-service (WS) | 8005 |

### Points importants
- `redirect_slashes=False` sur tous les FastAPI — évite les 307 redirect
- CORS géré uniquement par FastAPI (pas nginx)
- WebSocket : timeout 7 jours pour connexions longue durée
- Ollama via variable nginx (`$ollama_upstream`) — démarrage sans crash si absent

---

## Assistant IA — Ollama

L'assistant IA est basé sur **Ollama** avec le modèle **Llama3 8B** de Meta, déployé localement sur les serveurs de l'EST Salé. Aucune donnée ne transite par des services cloud externes.

### En développement (optionnel)

Pour tester l'IA en local, ajouter dans `docker-compose.infra.yml` :

```yaml
  ollama:
    image: ollama/ollama
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - ent-network
```

Puis pull le modèle (~4.7 Go) :

```powershell
docker exec ollama ollama pull llama3
```

---

## Déploiement Kubernetes

### Structure des manifests

```
k8s/
├── namespace.yaml          # Namespace: ent-est-sale
├── configmap.yaml          # Variables d'environnement
├── secrets.yaml            # Credentials chiffrés
├── infra/                  # StatefulSets + PVC
├── services/               # Deployments microservices
├── frontend/               # Deployment frontend
└── gateway/                # Deployment + NodePort
```

### Ports NodePort (accès externe)

| Service | NodePort |
|---------|----------|
| Gateway (API) | 30080 |
| Frontend | 30300 |
| Keycloak | 30808 |

---

## Déploiement sur Serveur EST Salé

### Depuis le PC Windows — Transfert SCP

```powershell
scp -r D:\ENT-ESTS\k8s user@IP_SERVEUR_EST:~/ent-est-sale/
scp D:\ENT-ESTS\deploy-est.sh user@IP_SERVEUR_EST:~/ent-est-sale/
```

### Sur la VM Ubuntu — Exécution

```bash
ssh user@IP_SERVEUR_EST
cd ~/ent-est-sale
chmod +x deploy-est.sh
./deploy-est.sh
```

### Ce que le script installe automatiquement

- curl, bash, git, wget (si absents)
- Docker (via get.docker.com)
- Minikube
- kubectl
- Déploiement complet Kubernetes
- Index Cassandra
- Salons chat par défaut
- Pull modèle Llama3 (~4.7 Go)

### Mise à jour après modification du code

```powershell
# Rebuild et push l'image modifiée
docker build -t mehdiechchentili/ent-<service>:latest D:\ENT-ESTS\<dossier>
docker push mehdiechchentili/ent-<service>:latest
```

```bash
# Sur la VM — rolling update sans interruption
kubectl rollout restart deployment/<service> -n ent-est-sale
```

---

## Images Docker Hub

Toutes les images sont disponibles sur [Docker Hub](https://hub.docker.com/u/mehdiechchentili) :

| Image | Tag |
|-------|-----|
| `mehdiechchentili/ent-users-service` | latest |
| `mehdiechchentili/ent-courses-service` | latest |
| `mehdiechchentili/ent-messaging-service` | latest |
| `mehdiechchentili/ent-calendar-service` | latest |
| `mehdiechchentili/ent-chat-service` | latest |
| `mehdiechchentili/ent-exams-service` | latest |
| `mehdiechchentili/ent-notifications-service` | latest |
| `mehdiechchentili/ent-frontend` | latest |
| `mehdiechchentili/ent-gateway` | latest |

### Rebuild toutes les images

```powershell
cd D:\ENT-ESTS
.\build-and-push.ps1
```

---

## Commandes Utiles

### Docker Compose (développement)

```powershell
# Démarrer tous les services
docker-compose -f docker-compose.infra.yml up -d

# Arrêter tous les services
docker-compose -f docker-compose.infra.yml down

# Rebuild un service sans cache
docker-compose -f docker-compose.infra.yml build --no-cache <service>

# Logs en temps réel
docker logs -f <service>

# Redémarrer gateway après rebuild (rafraîchir IPs Docker)
docker restart gateway
```

### Cassandra

```powershell
# Accéder à cqlsh
docker exec -it cassandra cqlsh

# Vérifier les keyspaces
docker exec -it cassandra cqlsh -e "SELECT keyspace_name FROM system_schema.keyspaces;"

# Vérifier les notifications
docker exec -it cassandra cqlsh -e "SELECT user_id, event_type, title FROM ent_notifications.notifications;"

# Vérifier les rooms chat
docker exec -it cassandra cqlsh -e "SELECT name, restricted_to FROM ent_chat.chat_rooms;"
```

### Token de test (PowerShell)

```powershell
# Obtenir un token frais pour les tests API
$token = (curl.exe -s -X POST "http://127.0.0.1:8080/realms/ent-est/protocol/openid-connect/token" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=password&client_id=ent-frontend&username=etudiant1&password=etudiant123" `
  | ConvertFrom-Json).access_token
```

### Kubernetes (production)

```bash
# État des pods
kubectl get pods -n ent-est-sale

# Logs d'un service
kubectl logs -f deployment/courses-service -n ent-est-sale

# Accéder à Cassandra
kubectl exec -it statefulset/cassandra -n ent-est-sale -- cqlsh

# Rolling update
kubectl rollout restart deployment/<service> -n ent-est-sale

# URLs d'accès
minikube service list -n ent-est-sale
```

---

## Auteurs

Projet réalisé dans le cadre du PFE — Licence Professionnelle  
**École Supérieure de Technologie de Salé** — Université Mohammed V de Rabat

---

*ENT EST Salé — Architecture Microservices | FastAPI | React | Cassandra | Keycloak | RabbitMQ | Docker | Kubernetes | Ollama*