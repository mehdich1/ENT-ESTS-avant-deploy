#!/bin/bash
set -e

echo "================================================"
echo "   Deploiement ENT EST Sale"
echo "================================================"

# 1. Mise à jour système
echo "[0/7] Mise à jour des paquets système..."
sudo apt-get update -y

# 2. Outils de base
echo "[1/7] Vérification outils de base..."

if ! command -v curl &> /dev/null; then
    echo "  -> Installation curl..."
    sudo apt-get install -y curl
else
    echo "  -> curl OK"
fi

if ! command -v bash &> /dev/null; then
    echo "  -> Installation bash..."
    sudo apt-get install -y bash
else
    echo "  -> bash OK"
fi

if ! command -v git &> /dev/null; then
    echo "  -> Installation git..."
    sudo apt-get install -y git
else
    echo "  -> git OK"
fi

if ! command -v wget &> /dev/null; then
    echo "  -> Installation wget..."
    sudo apt-get install -y wget
else
    echo "  -> wget OK"
fi

if ! command -v apt-transport-https &> /dev/null; then
    sudo apt-get install -y apt-transport-https ca-certificates gnupg lsb-release
fi

# 3. Docker
echo "[2/7] Vérification Docker..."
if ! command -v docker &> /dev/null; then
    echo "  -> Installation Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
    newgrp docker
else
    echo "  -> Docker OK ($(docker --version))"
fi

# 4. Minikube
echo "[3/7] Vérification Minikube..."
if ! command -v minikube &> /dev/null; then
    echo "  -> Installation Minikube..."
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube
    rm minikube-linux-amd64
else
    echo "  -> Minikube OK ($(minikube version --short))"
fi

# 5. kubectl
echo "[4/7] Vérification kubectl..."
if ! command -v kubectl &> /dev/null; then
    echo "  -> Installation kubectl..."
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm kubectl
else
    echo "  -> kubectl OK ($(kubectl version --client --short 2>/dev/null))"
fi

# 6. Démarrage Minikube
echo "[5/7] Démarrage Minikube..."
if minikube status &> /dev/null; then
    echo "  -> Minikube déjà en cours d'exécution"
else
    minikube start --driver=docker --memory=8192 --cpus=4
fi

# 7. Namespace + Config + Secrets
echo "[6/7] Configuration Kubernetes..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 8. Infrastructure (ordre important)
echo "[7/7] Déploiement infrastructure..."

echo "  -> Cassandra..."
kubectl apply -f k8s/infra/cassandra.yaml
echo "  Attente démarrage Cassandra (90s)..."
sleep 90
kubectl wait --for=condition=ready pod -l app=cassandra -n ent-est-sale --timeout=180s || echo "Cassandra pas encore prêt, on continue..."

echo "  -> RabbitMQ..."
kubectl apply -f k8s/infra/rabbitmq.yaml
sleep 30

echo "  -> MinIO..."
kubectl apply -f k8s/infra/minio.yaml
sleep 20

echo "  -> Keycloak..."
kubectl apply -f k8s/infra/keycloak-realm-configmap.yaml
kubectl apply -f k8s/infra/keycloak.yaml
echo "  Attente démarrage Keycloak (90s)..."
sleep 90

# 9. Services applicatifs
echo "  -> Services métier..."
kubectl apply -f k8s/services/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/gateway/

echo "  Attente démarrage des services (60s)..."
sleep 60

# 10. Index Cassandra
echo "  -> Création index Cassandra..."
kubectl exec -n ent-est-sale statefulset/cassandra -- cqlsh -e "
CREATE INDEX IF NOT EXISTS ON ent_notifications.notifications (user_id);
CREATE INDEX IF NOT EXISTS ON ent_exams.submissions (exam_id);
CREATE INDEX IF NOT EXISTS ON ent_exams.submissions (student_id);
CREATE INDEX IF NOT EXISTS ON ent_chat.chat_messages (room_id);
CREATE INDEX IF NOT EXISTS ON ent_messaging.messages (receiver_id);
CREATE INDEX IF NOT EXISTS ON ent_messaging.messages (sender_id);
" || echo "  Index a créer manuellement si Cassandra pas encore prêt"

# 11. Rooms chat par défaut
echo "  -> Création salons chat..."
kubectl exec -n ent-est-sale statefulset/cassandra -- cqlsh -e "
INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
VALUES (uuid(), 'general', 'Salon général', 'all', uuid(), toTimestamp(now()));
INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
VALUES (uuid(), 'enseignants', 'Salon enseignants', 'enseignant', uuid(), toTimestamp(now()));
INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
VALUES (uuid(), 'etudiants', 'Salon étudiants', 'etudiant', uuid(), toTimestamp(now()));
" || echo "  Salons a créer manuellement si Cassandra pas encore prêt"

# 12. Modèle Ollama
echo "  -> Téléchargement modèle Llama3 (~4.7 Go, peut prendre 10-20 min)..."
kubectl exec -n ent-est-sale deployment/ollama -- ollama pull llama3 || echo "  Ollama pas encore prêt — relancer manuellement : kubectl exec -n ent-est-sale deployment/ollama -- ollama pull llama3"

# 13. Résumé final
echo ""
echo "================================================"
echo "   État des pods"
echo "================================================"
kubectl get pods -n ent-est-sale

echo ""
echo "================================================"
echo "   URLs d'accès"
echo "================================================"
echo "Application  : $(minikube service frontend-nodeport  -n ent-est-sale --url 2>/dev/null || echo 'En cours de démarrage...')"
echo "Gateway      : $(minikube service gateway-service    -n ent-est-sale --url 2>/dev/null || echo 'En cours de démarrage...')"
echo "Keycloak     : $(minikube service keycloak-nodeport  -n ent-est-sale --url 2>/dev/null || echo 'En cours de démarrage...')"

echo ""
echo "================================================"
echo "   Déploiement terminé !"
echo "================================================"