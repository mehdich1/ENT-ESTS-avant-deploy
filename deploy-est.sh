#!/bin/bash

echo "================================================"
echo "   Deploiement ENT EST Sale"
echo "================================================"

# 1. Mise à jour système
echo "[0/7] Mise à jour des paquets système..."
sudo apt-get update -y

# 2. Outils de base
echo "[1/7] Vérification outils de base..."

for pkg in curl bash git wget apt-transport-https ca-certificates gnupg lsb-release; do
    if ! command -v $pkg &> /dev/null; then
        echo "  -> Installation $pkg..."
        sudo apt-get install -y $pkg
    else
        echo "  -> $pkg OK"
    fi
done

# 3. Docker
echo "[2/7] Vérification Docker..."
if ! command -v docker &> /dev/null; then
    echo "  -> Installation Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "  -> Docker installé. Veuillez vous déconnecter/reconnecter pour appliquer les droits, puis relancer le script."
    exit 1
else
    echo "  -> Docker OK ($(docker --version))"
fi

# Vérification que l'utilisateur peut utiliser Docker
if ! docker ps &> /dev/null; then
    echo "  -> L'utilisateur n'a pas accès à Docker. Ajout au groupe docker..."
    sudo usermod -aG docker $USER
    echo "  -> Droits ajoutés. Veuillez vous déconnecter/reconnecter, puis relancer le script."
    exit 1
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
    KUBECTL_VERSION=$(kubectl version --client -o yaml 2>/dev/null | grep gitVersion | cut -d' ' -f2)
    echo "  -> kubectl OK (${KUBECTL_VERSION:-version inconnue})"
fi

# 6. Démarrage Minikube
echo "[5/7] Démarrage Minikube..."
if minikube status &> /dev/null; then
    echo "  -> Minikube déjà en cours d'exécution"
else
    minikube start --driver=docker --memory=8192 --cpus=4
    echo "  -> Attente que le cluster soit prêt..."
    sleep 10
    kubectl wait --for=condition=Ready nodes --all --timeout=120s
fi

# 7. Namespace + Config + Secrets
echo "[6/7] Configuration Kubernetes..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 8. Infrastructure (ordre important)
echo "[7/7] Déploiement infrastructure..."

INFRA_DIR="k8s/infra"
if [ ! -d "$INFRA_DIR" ]; then
    echo "Erreur : le dossier $INFRA_DIR n'existe pas"
    exit 1
fi

echo "  -> Cassandra..."
kubectl apply -f $INFRA_DIR/cassandra.yaml
kubectl rollout status statefulset/cassandra -n ent-est-sale --timeout=180s

echo "  -> RabbitMQ..."
kubectl apply -f $INFRA_DIR/rabbitmq.yaml
# On attend mais on ne bloque pas en cas d'échec
if kubectl rollout status deployment/rabbitmq -n ent-est-sale --timeout=180s; then
    echo "  RabbitMQ prêt"
else
    echo "  ⚠️ RabbitMQ n'est pas devenu prêt dans le temps imparti. Vérifiez les logs ci-dessous :"
    kubectl describe pod -l app=rabbitmq -n ent-est-sale
    kubectl logs -l app=rabbitmq -n ent-est-sale --tail=50
fi

echo "  -> MinIO..."
kubectl apply -f $INFRA_DIR/minio.yaml
kubectl rollout status deployment/minio -n ent-est-sale --timeout=120s

echo "  -> Keycloak..."
kubectl apply -f $INFRA_DIR/keycloak-realm-configmap.yaml
kubectl apply -f $INFRA_DIR/keycloak.yaml
kubectl rollout status deployment/keycloak -n ent-est-sale --timeout=180s

# 9. Services applicatifs
echo "  -> Services métier..."
for dir in services frontend gateway; do
    if [ -d "k8s/$dir" ]; then
        kubectl apply -f k8s/$dir/
    else
        echo "  -> Dossier k8s/$dir manquant, ignoré"
    fi
done

# Attendre que tous les déploiements soient prêts
echo "  Attente que tous les services soient prêts..."
for dep in calendar-service chat-service courses-service exams-service messaging-service notifications-service ollama users-service frontend gateway; do
    echo "  -> Attente de $dep..."
    if kubectl rollout status deployment/$dep -n ent-est-sale --timeout=300s; then
        echo "    $dep OK"
    else
        echo "    ⚠️ $dep non prêt après 5 minutes. Vérifiez les logs."
        kubectl describe pod -l app=$dep -n ent-est-sale
        kubectl logs -l app=$dep -n ent-est-sale --tail=50
    fi
done

# 10. Index Cassandra (après que les services ont créé les keyspaces)
echo "  -> Création index Cassandra (attente que les services aient créé les keyspaces)..."
sleep 60  # laisser le temps aux services de créer leurs keyspaces
for i in {1..5}; do
    echo "  Tentative $i..."
    if kubectl exec -n ent-est-sale statefulset/cassandra -- cqlsh -e "
        CREATE INDEX IF NOT EXISTS ON ent_notifications.notifications (user_id);
        CREATE INDEX IF NOT EXISTS ON ent_exams.submissions (exam_id);
        CREATE INDEX IF NOT EXISTS ON ent_exams.submissions (student_id);
        CREATE INDEX IF NOT EXISTS ON ent_chat.chat_messages (room_id);
        CREATE INDEX IF NOT EXISTS ON ent_messaging.messages (receiver_id);
        CREATE INDEX IF NOT EXISTS ON ent_messaging.messages (sender_id);
    " 2>/dev/null; then
        echo "  Index créés avec succès"
        break
    else
        echo "  Échec, attente 30s avant nouvelle tentative..."
        sleep 30
    fi
done

# 11. Rooms chat par défaut
echo "  -> Création salons chat..."
for i in {1..5}; do
    echo "  Tentative $i..."
    if kubectl exec -n ent-est-sale statefulset/cassandra -- cqlsh -e "
        INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
        VALUES (uuid(), 'general', 'Salon général', 'all', uuid(), toTimestamp(now()));
        INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
        VALUES (uuid(), 'enseignants', 'Salon enseignants', 'enseignant', uuid(), toTimestamp(now()));
        INSERT INTO ent_chat.chat_rooms (id, name, description, restricted_to, created_by, created_at)
        VALUES (uuid(), 'etudiants', 'Salon étudiants', 'etudiant', uuid(), toTimestamp(now()));
    " 2>/dev/null; then
        echo "  Salons créés avec succès"
        break
    else
        echo "  Échec, attente 30s avant nouvelle tentative..."
        sleep 30
    fi
done

# 12. Modèle Ollama
echo "  -> Téléchargement modèle Llama3 (~4.7 Go, peut prendre 10-20 min)..."
if kubectl wait --for=condition=ready pod -l app=ollama -n ent-est-sale --timeout=300s 2>/dev/null; then
    kubectl exec -n ent-est-sale deployment/ollama -- ollama pull llama3 || echo "  Échec du téléchargement. Relancez manuellement : kubectl exec -n ent-est-sale deployment/ollama -- ollama pull llama3"
else
    echo "  Pod ollama non prêt. Vérifiez son état avec 'kubectl describe pod -l app=ollama -n ent-est-sale'"
fi

# 13. Résumé final
echo ""
echo "================================================"
echo "   État des pods"
echo "================================================"
kubectl get pods -n ent-est-sale

# Vérification rapide des services non prêts
if command -v jq &> /dev/null; then
    NOT_READY=$(kubectl get pods -n ent-est-sale -o json | jq -r '.items[] | select(.status.phase!="Running") | .metadata.name')
    if [ -n "$NOT_READY" ]; then
        echo ""
        echo "⚠️  Les pods suivants ne sont pas prêts :"
        echo "$NOT_READY"
        echo "Vérifiez les logs avec : kubectl describe pod <nom> -n ent-est-sale"
    fi
else
    echo "Installation de jq recommandée pour une meilleure analyse des pods."
fi

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