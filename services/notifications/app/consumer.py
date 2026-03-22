import pika, json, os, uuid, threading, time
from datetime import datetime, timezone
from app.database import get_session

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "admin")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "admin123")
EXCHANGE_NAME = "ent_notifications"


def build_notification(event_type: str, payload: dict):
    if event_type == "new_course":
        return {"title": "Nouveau cours disponible",
                "message": f"Le cours « {payload.get('title', '')} » a été publié",
                "link": "/courses"}
    elif event_type == "new_exam":
        return {"title": "Nouvel examen / devoir",
                "message": f"« {payload.get('title', '')} » — limite : {payload.get('deadline', '')}",
                "link": "/exams"}
    elif event_type == "new_message":
        sender = payload.get('sender_username', "quelqu'un")
        return {"title": "Nouveau message",
                "message": f"Message de {sender}",
                "link": "/messaging"}
    elif event_type == "new_event":
        return {"title": "Nouvel événement",
                "message": f"« {payload.get('title', '')} » ajouté au calendrier",
                "link": "/calendar"}
    elif event_type == "exam_graded":
        return {"title": "Devoir corrigé",
                "message": f"Votre rendu a reçu la note {payload.get('grade', '')}/20",
                "link": "/exams"}
    elif event_type == "submission_received":
        return {"title": "Nouveau rendu",
                "message": f"{payload.get('student_username', 'Un étudiant')} a rendu « {payload.get('exam_title', '')} »",
                "link": "/exams"}
    return {"title": event_type, "message": str(payload), "link": "/"}


def get_target_users(event_type: str, payload: dict):
    """
    Utilise la session partagée get_session() pour éviter les conflits.
    Ferme proprement la session temporaire vers ent_users.
    """
    from cassandra.cluster import Cluster
    cluster = None
    try:
        cluster = Cluster([os.getenv("CASSANDRA_HOST", "cassandra")])
        s = cluster.connect("ent_users")
        rows = list(s.execute("SELECT id, role FROM users"))

        if event_type in ("new_course", "new_exam"):
            return [str(r.id) for r in rows if r.role == "etudiant"]
        elif event_type == "new_message":
            rid = payload.get("receiver_id")
            return [rid] if rid else []
        elif event_type == "new_event":
            return [str(r.id) for r in rows]
        elif event_type == "exam_graded":
            sid = payload.get("student_id")
            return [sid] if sid else []
        elif event_type == "submission_received":
            tid = payload.get("teacher_id")
            return [tid] if tid else []
    except Exception as e:
        print(f"[Consumer] Erreur get_target_users: {e}")
        return []
    finally:
        if cluster:
            try:
                cluster.shutdown()
            except Exception:
                pass
    return []


def save_notification(user_id: str, event_type: str, notif: dict):
    if not user_id:
        print("[Consumer] user_id vide, notification ignorée")
        return
    try:
        uid = uuid.UUID(str(user_id))
    except (ValueError, AttributeError) as e:
        print(f"[Consumer] user_id invalide '{user_id}': {e}")
        return
    try:
        session = get_session()
        now = datetime.now(timezone.utc)
        session.execute("""
            INSERT INTO notifications (id, user_id, event_type, title, message, link, is_read, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (uuid.uuid4(), uid, event_type,
              notif["title"], notif["message"], notif["link"], False, now))
    except Exception as e:
        print(f"[Consumer] Erreur save_notification: {e}")


def on_message(channel, method, properties, body):
    try:
        data = json.loads(body)
        event_type = data.get("event_type", "")
        payload = data.get("payload", {})
        print(f"[Consumer] Reçu: {event_type}")

        notif = build_notification(event_type, payload)
        target_users = get_target_users(event_type, payload)

        for user_id in target_users:
            save_notification(user_id, event_type, notif)

        channel.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[Consumer] Notifié {len(target_users)} utilisateur(s)")
    except Exception as e:
        print(f"[Consumer] Erreur traitement: {e}")
        try:
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception:
            pass


def start_consumer():
    while True:
        try:
            credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
            params = pika.ConnectionParameters(
                host=RABBITMQ_HOST, port=RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=60,
                connection_attempts=5, retry_delay=3
            )
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.exchange_declare(
                exchange=EXCHANGE_NAME, exchange_type="topic", durable=True
            )
            channel.queue_declare(queue="notifications_queue", durable=True)
            channel.queue_bind(
                exchange=EXCHANGE_NAME,
                queue="notifications_queue",
                routing_key="#"
            )
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue="notifications_queue", on_message_callback=on_message)
            print("[Consumer] En attente de messages...")
            channel.start_consuming()
        except Exception as e:
            print(f"[Consumer] Connexion perdue, retry dans 5s: {e}")
            time.sleep(5)


def start_consumer_thread():
    t = threading.Thread(target=start_consumer, daemon=True, name="rabbitmq-consumer")
    t.start()
    print(f"[Consumer] Thread démarré: {t.name}")
    return t