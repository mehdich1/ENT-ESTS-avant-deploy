import pika, json, os
from datetime import datetime, timezone

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "admin")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "admin123")
EXCHANGE_NAME = "ent_notifications"


def publish_notification(event_type: str, payload: dict):
    """
    Publie une notification sur RabbitMQ.
    event_type: 'new_course' | 'new_exam' | 'new_message' | 'new_event'
                'exam_graded' | 'submission_received'
    payload: dict avec les infos de la notification
    """
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        params = pika.ConnectionParameters(
            host=RABBITMQ_HOST, port=RABBITMQ_PORT,
            credentials=credentials,
            connection_attempts=2, retry_delay=1,
            socket_timeout=3
        )
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        channel.exchange_declare(
            exchange=EXCHANGE_NAME,
            exchange_type="topic",
            durable=True
        )

        message = {
            "event_type": event_type,
            "payload": payload,
            "published_at": datetime.now(timezone.utc).isoformat()
        }

        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=event_type,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)  # persistent
        )
        connection.close()
        print(f"[RabbitMQ] Published: {event_type}")
    except Exception as e:
        # Ne pas bloquer le service si RabbitMQ est indisponible
        print(f"[RabbitMQ] Publish failed (non-blocking): {e}")